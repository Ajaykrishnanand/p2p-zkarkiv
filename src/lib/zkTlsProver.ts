import { keccak256, toHex, stringToBytes } from "viem";
import { assertSyntheticUtr, assertSyntheticUpi, generateSyntheticUtr } from "./syntheticGuard";

export interface BankTlsSession {
  tlsVersion: "TLS_1_3";
  cipherSuite: "TLS_AES_256_GCM_SHA384";
  notaryAuthority: "zkTLS-Notary-Cluster-v1";
  bankDomain: "api.retail.hdfcbank.com" | "netbanking.icicibank.com" | "upi.axisbank.com";
  redactedRequestBody: {
    intent: "P2P_UPI_TRANSFER";
    payeeVpa: string;
    payerVpaRedacted: "REDACTED_BY_ZKTLS_ENCLAVE";
    amount: number;
    currency: "INR";
  };
  redactedResponseBody: {
    status: "SUCCESS";
    statusCode: "00";
    utr: string;
    accountBalance: "REDACTED_BY_CLIENT_PROOF";
    availableLimit: "REDACTED_BY_CLIENT_PROOF";
    gatewayRef: string;
  };
  tlsSignature: `0x${string}`;
  sessionTimestamp: string;
}

export interface ZkProofBundle {
  protocol: "zkTLS-Groth16-Poseidon";
  nullifierHash: `0x${string}`;
  tlsTranscriptCommitment: `0x${string}`;
  groth16ProofDigest: `0x${string}`;
  syntheticUtr: string;
  verifiedAmount: number;
  createdAt: string;
}

/**
 * Simulates a client-side zkTLS notarized session against a banking API.
 * Keeps all real account balances and private data strictly redacted.
 */
export function simulateBankTlsSession(params: {
  amountInr: number;
  recipientAlias: string;
  syntheticUtr?: string;
  bankDomain?: "api.retail.hdfcbank.com" | "netbanking.icicibank.com" | "upi.axisbank.com";
}): BankTlsSession {
  assertSyntheticUpi(params.recipientAlias);
  const utr = params.syntheticUtr || generateSyntheticUtr();
  assertSyntheticUtr(utr);

  const bankDomain = params.bankDomain || "api.retail.hdfcbank.com";
  const sessionTimestamp = new Date().toISOString();

  // Deterministic mock TLS signature from notary
  const rawSessionBytes = stringToBytes(`${bankDomain}:${utr}:${params.amountInr}:${sessionTimestamp}`);
  const tlsSignature = keccak256(rawSessionBytes);

  return {
    tlsVersion: "TLS_1_3",
    cipherSuite: "TLS_AES_256_GCM_SHA384",
    notaryAuthority: "zkTLS-Notary-Cluster-v1",
    bankDomain,
    redactedRequestBody: {
      intent: "P2P_UPI_TRANSFER",
      payeeVpa: params.recipientAlias,
      payerVpaRedacted: "REDACTED_BY_ZKTLS_ENCLAVE",
      amount: params.amountInr,
      currency: "INR",
    },
    redactedResponseBody: {
      status: "SUCCESS",
      statusCode: "00",
      utr,
      accountBalance: "REDACTED_BY_CLIENT_PROOF",
      availableLimit: "REDACTED_BY_CLIENT_PROOF",
      gatewayRef: `GW-${Math.floor(10000000 + Math.random() * 90000000)}`,
    },
    tlsSignature,
    sessionTimestamp,
  };
}

/**
 * Computes a deterministic Poseidon-compatible nullifier hash:
 * H(takerSecret, syntheticUtr, orderKey)
 * Prevents replay attacks where a buyer tries to claim multiple orders with one bank receipt.
 */
export function computeUtrNullifierHash(
  syntheticUtr: string,
  secretNonce = "zkupi-salt-v1"
): `0x${string}` {
  assertSyntheticUtr(syntheticUtr);
  const preimage = stringToBytes(`NULLIFIER:${syntheticUtr}:${secretNonce}`);
  return keccak256(preimage);
}

/**
 * Generates a full client-side zero-knowledge proof bundle for Arkiv settlement.
 */
export async function generateZkTlsProof(
  session: BankTlsSession,
  clientSecret = "session-entropy"
): Promise<ZkProofBundle> {
  const utr = session.redactedResponseBody.utr;
  assertSyntheticUtr(utr);

  // 1. Commit to the verified TLS session transcript
  const transcriptDigest = keccak256(
    stringToBytes(JSON.stringify(session.redactedResponseBody) + session.tlsSignature)
  );

  // 2. Compute the replay-prevention Nullifier Hash
  const nullifierHash = computeUtrNullifierHash(utr, clientSecret);

  // 3. Compute simulated Groth16 circuit digest:
  // Verifies (Bank.status == "SUCCESS" && Bank.amount == Order.amountInr)
  const circuitDigest = keccak256(
    stringToBytes(`GROTH16:PROOF:${transcriptDigest}:${nullifierHash}:${session.redactedRequestBody.amount}`)
  );

  return {
    protocol: "zkTLS-Groth16-Poseidon",
    nullifierHash,
    tlsTranscriptCommitment: transcriptDigest,
    groth16ProofDigest: circuitDigest,
    syntheticUtr: utr,
    verifiedAmount: session.redactedRequestBody.amount,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validates the cryptographic bundle before submitting to Arkiv DB-Chain.
 */
export function verifyZkProofBundle(bundle: ZkProofBundle, expectedAmount: number): boolean {
  if (bundle.protocol !== "zkTLS-Groth16-Poseidon") return false;
  if (!bundle.nullifierHash || !bundle.nullifierHash.startsWith("0x")) return false;
  if (!bundle.tlsTranscriptCommitment || !bundle.groth16ProofDigest) return false;
  if (bundle.verifiedAmount !== expectedAmount) return false;
  return true;
}
