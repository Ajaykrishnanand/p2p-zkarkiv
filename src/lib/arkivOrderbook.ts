import {
  ExpirationTime,
  str,
  u256,
  bool,
  jsonToPayload,
} from "@arkiv-network/sdk";
import { assertSyntheticUpi } from "./syntheticGuard";

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
  expiresAt?: number | null;
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
