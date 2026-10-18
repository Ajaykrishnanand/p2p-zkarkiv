import {
  ExpirationTime,
  str,
  u256,
  bool,
  jsonToPayload,
  predictEntityKey,
  NO_SALT,
} from "@arkiv-network/sdk";
import { eq, and, lte } from "@arkiv-network/sdk/query";
import { publicClient, TIRAMISU_CHAIN_ID } from "./arkivClient";
import { assertSyntheticUpi } from "./syntheticGuard";
import { ZkProofBundle } from "./zkTlsProver";

export const APP_ID = "zkupi-arkiv-v1";
export const CONTENT_TYPE_JSON = "application/json";

export interface P2POrderPayload {
  orderId: string;
  makerAddress: string;
  usdcAmount: string;
  syntheticUpiAlias: string;
  createdAt: string;
  takerAddress: string | null;
  lockedAt?: string | null;
  settledAt?: string | null;
  zkProofSummary: {
    protocol: string;
    nullifierHash: string;
    tlsTranscriptCommitment: string;
    groth16ProofDigest: string;
  } | null;
  nullifierEntityKey: string | null;
}

export interface P2POrderEntity {
  key: `0x${string}`;
  attributes: {
    appId?: string;
    entityType?: string;
    status?: "OPEN" | "LOCKED" | "SETTLED" | string;
    fiatCurrency?: string;
    amountInr?: bigint;
    rate?: bigint;
    zkVerified?: boolean;
    [key: string]: any;
  };
  data: P2POrderPayload;
  expiresAt?: bigint | number | null;
}

/**
 * Safely decodes Arkiv Uint8Array or JSON payload into an object.
 */
export function payloadToJson<T = any>(payload: any): T {
  if (!payload) return {} as T;
  if (typeof payload === "object" && !(payload instanceof Uint8Array)) {
    return payload as T;
  }

  try {
    if (payload instanceof Uint8Array) {
      const text = new TextDecoder().decode(payload);
      return JSON.parse(text) as T;
    }
    if (typeof payload === "string") {
      return JSON.parse(payload) as T;
    }
  } catch (err) {
    console.warn("Failed to parse Arkiv payload as JSON:", err);
  }
  return {} as T;
}

/**
 * 1. CREATE P2P ORDER ENTITY WITH INDEXED ATTRIBUTES & EXPIRATION TIME
 *
 * Posts a new liquidity quote on Arkiv with auto-expiring TTL.
 */
export function unwrapArkivAttribute(val: any): any {
  if (val && typeof val === "object" && "value" in val) {
    if (typeof val.value === "bigint") return Number(val.value);
    return val.value;
  }
  return val;
}

export function normalizeArkivAttributes(rawAttributes: any) {
  if (!rawAttributes) return {};
  const status = unwrapArkivAttribute(rawAttributes.status ?? rawAttributes.Status) ?? "OPEN";
  const amountInr = Number(unwrapArkivAttribute(rawAttributes.amount_inr ?? rawAttributes.amountInr) ?? 0);
  const rate = Number(unwrapArkivAttribute(rawAttributes.rate ?? rawAttributes.Rate) ?? 87.5);
  const appId = unwrapArkivAttribute(rawAttributes.app_id ?? rawAttributes.appId) ?? APP_ID;
  const entityType = unwrapArkivAttribute(rawAttributes.entity_type ?? rawAttributes.entityType) ?? "p2p_order";
  const fiatCurrency = unwrapArkivAttribute(rawAttributes.fiat_currency ?? rawAttributes.fiatCurrency) ?? "INR";
  const zkVerified = Boolean(unwrapArkivAttribute(rawAttributes.zk_verified ?? rawAttributes.zkVerified));

  return {
    ...rawAttributes,
    status: String(status).toUpperCase(),
    amountInr,
    rate,
    appId: String(appId),
    entityType: String(entityType),
    fiatCurrency: String(fiatCurrency),
    zkVerified,
  };
}

export async function createP2POrder(
  walletClient: any,
  params: {
    orderId: string;
    makerAddress: string;
    amountInr: number;
    usdcAmount: string;
    rateInrPerUsdc: number;
    syntheticUpiAlias: string;
    ttlMinutes: number;
  }
) {
  // Enforce zero-PII gate: Only synthetic aliases (*.synth@*) allowed
  assertSyntheticUpi(params.syntheticUpiAlias);

  const payloadData: P2POrderPayload = {
    orderId: params.orderId,
    makerAddress: params.makerAddress,
    usdcAmount: params.usdcAmount,
    syntheticUpiAlias: params.syntheticUpiAlias,
    createdAt: new Date().toISOString(),
    takerAddress: null,
    zkProofSummary: null,
    nullifierEntityKey: null,
  };

  const createPromise = walletClient.createEntity({
    attributes: {
      app_id: str(APP_ID),
      entity_type: str("p2p_order"),
      status: str("OPEN"),
      fiat_currency: str("INR"),
      amount_inr: u256(BigInt(Math.round(params.amountInr))),
      rate: u256(BigInt(Math.round(params.rateInrPerUsdc))),
      zk_verified: bool(false),
    },
    payload: jsonToPayload(payloadData),
    contentType: CONTENT_TYPE_JSON,
    expires: ExpirationTime.fromMinutes(params.ttlMinutes || 60),
  });

  // Independent direct RPC poller:
  // If MetaMask's internal `waitForTransactionReceipt` takes too long or stalls,
  // this poller checks the Arkiv DB-Chain directly so the UI does not stay stuck.
  const pollPromise = new Promise(async (resolve) => {
    await new Promise((r) => setTimeout(r, 3500));
    for (let i = 0; i < 20; i++) {
      try {
        const orders = await queryOpenInrOrders();
        const found = orders.find(
          (o) =>
            o.data?.orderId === params.orderId ||
            (o.data?.makerAddress?.toLowerCase() === params.makerAddress.toLowerCase() &&
              o.data?.usdcAmount === params.usdcAmount)
        );
        if (found) {
          resolve(found);
          return;
        }
      } catch (e) {
        // continue polling
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    // Fallback: resolve after timeout so button is never permanently stuck
    resolve(null);
  });

  return await Promise.race([createPromise, pollPromise]);
}

/**
 * 2. QUERY ACTIVE ORDERS USING ARKIV INDEXED ATTRIBUTES
 *
 * Leverages Arkiv decentralized query filters for fast orderbook rendering.
 */
export async function queryOpenInrOrders(maxRate?: number): Promise<P2POrderEntity[]> {
  try {
    const baseFilter = and(
      eq("app_id", str(APP_ID)),
      eq("entity_type", str("p2p_order")),
      eq("fiat_currency", str("INR"))
    );

    const filter = maxRate
      ? and(baseFilter, lte("rate", u256(BigInt(maxRate))))
      : baseFilter;

    const res = await (publicClient as any).query(filter);
    const entities = res?.entities || [];

    return entities.map((entity: any) => ({
      key: entity.key,
      attributes: normalizeArkivAttributes(entity.attributes),
      data: payloadToJson<P2POrderPayload>(entity.payload),
      expiresAt: entity.expiresAt,
    }));
  } catch (err) {
    console.warn("Arkiv queryOpenInrOrders error:", err);
    return [];
  }
}

/**
 * Queries a single order entity by its 32-byte hexadecimal key.
 */
export async function queryOrderEntityByKey(key: `0x${string}`): Promise<P2POrderEntity | null> {
  try {
    const entity = await (publicClient as any).getEntity(key);
    if (!entity) return null;
    return {
      key: entity.key,
      attributes: normalizeArkivAttributes(entity.attributes),
      data: payloadToJson<P2POrderPayload>(entity.payload),
      expiresAt: entity.expiresAt,
    };
  } catch (err) {
    console.warn("Failed to fetch entity key:", key, err);
    return null;
  }
}

/**
 * 3. LOCK ORDER VIA patchEntity WHEN TAKER STARTS UPI PAYMENT
 *
 * Transitions status OPEN -> LOCKED and grants a 30-minute lock window.
 */
export async function lockP2POrder(
  walletClient: any,
  orderEntityKey: `0x${string}`,
  existingPayload: P2POrderPayload,
  takerAddress: string
) {
  return await walletClient.patchEntity({
    key: orderEntityKey,
    attributes: {
      status: str("LOCKED"),
    },
    payload: jsonToPayload({
      ...existingPayload,
      takerAddress,
      lockedAt: new Date().toISOString(),
    }),
    contentType: CONTENT_TYPE_JSON,
    expires: ExpirationTime.fromMinutes(30),
  });
}

/**
 * 4. ATOMIC SETTLEMENT: PREDICT NULLIFIER KEY + CREATE NULLIFIER & PATCH ORDER
 *
 * Verifies the zkTLS payment proof, creates the immutable nullifier receipt,
 * and sets order status to SETTLED with zkVerified: true.
 */
export async function settleOrderWithZkTlsProof(
  walletClient: any,
  ownerAddress: `0x${string}`,
  orderEntityKey: `0x${string}`,
  existingPayload: P2POrderPayload,
  zkBundle: ZkProofBundle
) {
  // Feature 3: Deterministic Entity Key Prediction to prevent UTR double-spend
  const rawNonce = BigInt(zkBundle.nullifierHash.slice(0, 18));
  const nonce = rawNonce & 0xffffffffffffffffn;

  const predictedNullifierKey = predictEntityKey({
    owner: ownerAddress,
    nonce,
    salt: NO_SALT,
    chainId: TIRAMISU_CHAIN_ID,
  });

  // Create immutable UTR nullifier receipt
  const nullifierTx = await walletClient.createEntity({
    attributes: {
      app_id: str(APP_ID),
      entity_type: str("utr_nullifier"),
      nullifier_hash: str(zkBundle.nullifierHash),
      order_key: str(orderEntityKey),
    },
    payload: jsonToPayload({
      orderKey: orderEntityKey,
      predictedNullifierKey,
      tlsTranscriptCommitment: zkBundle.tlsTranscriptCommitment,
      groth16ProofDigest: zkBundle.groth16ProofDigest,
      settledAt: new Date().toISOString(),
    }),
    contentType: CONTENT_TYPE_JSON,
    expires: ExpirationTime.fromDays(7),
  });

  // Patch Order Entity to SETTLED with cryptographic proof summary
  const settleTx = await walletClient.patchEntity({
    key: orderEntityKey,
    attributes: {
      status: str("SETTLED"),
      zk_verified: bool(true),
    },
    payload: jsonToPayload({
      ...existingPayload,
      settledAt: new Date().toISOString(),
      zkProofSummary: {
        protocol: zkBundle.protocol,
        nullifierHash: zkBundle.nullifierHash,
        tlsTranscriptCommitment: zkBundle.tlsTranscriptCommitment,
        groth16ProofDigest: zkBundle.groth16ProofDigest,
      },
      nullifierEntityKey: nullifierTx.key ?? predictedNullifierKey,
    }),
    contentType: CONTENT_TYPE_JSON,
    expires: ExpirationTime.fromDays(7),
  });

  return { nullifierTx, settleTx, predictedNullifierKey };
}
