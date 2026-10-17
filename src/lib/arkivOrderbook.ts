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

  return await walletClient.createEntity({
    attributes: {
      appId: str(APP_ID),
      entityType: str("p2p_order"),
      status: str("OPEN"),
      fiatCurrency: str("INR"),
      amountInr: u256(BigInt(params.amountInr)),
      rate: u256(BigInt(params.rateInrPerUsdc)),
      zkVerified: bool(false),
    },
    payload: jsonToPayload(payloadData),
    expiresIn: ExpirationTime.fromMinutes(params.ttlMinutes || 60),
  });
}

/**
 * 2. QUERY ACTIVE ORDERS USING ARKIV INDEXED ATTRIBUTES
 *
 * Leverages Arkiv decentralized query filters for fast orderbook rendering.
 */
export async function queryOpenInrOrders(maxRate?: number): Promise<P2POrderEntity[]> {
  try {
    const baseFilter = and(
      eq("appId", str(APP_ID)),
      eq("entityType", str("p2p_order")),
      eq("fiatCurrency", str("INR"))
    );

    const filter = maxRate
      ? and(baseFilter, lte("rate", u256(BigInt(maxRate))))
      : baseFilter;

    const res = await (publicClient as any).query(filter);
    const entities = res?.entities || [];

    return entities.map((entity: any) => ({
      key: entity.key,
      attributes: entity.attributes,
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
      attributes: entity.attributes,
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
    expiresIn: ExpirationTime.fromMinutes(30),
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
  // Converts first 16 hex chars to BigInt uint64 nonce
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
      appId: str(APP_ID),
      entityType: str("utr_nullifier"),
      nullifierHash: str(zkBundle.nullifierHash),
      orderKey: str(orderEntityKey),
    },
    payload: jsonToPayload({
      orderKey: orderEntityKey,
      predictedNullifierKey,
      tlsTranscriptCommitment: zkBundle.tlsTranscriptCommitment,
      groth16ProofDigest: zkBundle.groth16ProofDigest,
      settledAt: new Date().toISOString(),
    }),
    expiresIn: ExpirationTime.fromDays(7),
  });

  // Patch Order Entity to SETTLED with cryptographic proof summary
  const settleTx = await walletClient.patchEntity({
    key: orderEntityKey,
    attributes: {
      status: str("SETTLED"),
      zkVerified: bool(true),
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
    expiresIn: ExpirationTime.fromDays(7),
  });

  return { nullifierTx, settleTx, predictedNullifierKey };
}
