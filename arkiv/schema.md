# Arkiv Entity Schema & Data Lifecycle (`zkUPI-Arkiv`)

## 1. Architectural Overview: What Lives on Arkiv vs. Off-Arkiv

| Data Element | Stored on Arkiv? | Why / Storage Mechanism |
| :--- | :--- | :--- |
| **Order Liquidity Parameters (`amountInr`, `rate`, `status`)** | **YES (Indexed Attributes)** | Enables instant decentralized filtering (`status == "OPEN"`, `rate <= 88`) without a centralized Postgres server. |
| **Order Lifecycle TTL (`expiresIn`)** | **YES (`ExpirationTime`)** | Liquidity quotes automatically self-prune after 15–120 minutes so stale INR rates never clog the orderbook. |
| **Synthetic Counterparty Routing (`*.synth@upi`)** | **YES (JSON Payload)** | Uses strictly synthetic aliases (`rahul.synth@okaxis`) to demonstrate routing while complying 100% with Arkiv's zero-PII rule. |
| **zkTLS Proof Digest & Poseidon Nullifier** | **YES (Entity + Attributes)** | Prevents double-spending the same UPI payment receipt across multiple orders using `predictEntityKey` and indexed `nullifierHash`. |
| **Raw Bank TLS Transcript / Account Balance / Real VPA** | **NO (Strictly Client-Side)** | Kept strictly in ephemeral browser memory during zkTLS proof generation. Never touches Arkiv in plaintext or hashed form. |

---

## 2. Entity Type 1: `p2p_order`

Represents an active, locked, or settled INR-to-USDC P2P liquidity order.

### Indexed Attributes
| Attribute Key | SDK Type | Example Value | Query Purpose |
| :--- | :--- | :--- | :--- |
| `appId` | `str` | `"zkupi-arkiv-v1"` | Namespace isolation on Tiramisu testnet |
| `entityType` | `str` | `"p2p_order"` | Distinguishes orders from nullifier receipts |
| `status` | `str` | `"OPEN" \| "LOCKED" \| "SETTLED"` | Real-time state machine filtering |
| `fiatCurrency` | `str` | `"INR"` | Multi-currency extensibility |
| `amountInr` | `u256` | `5000n` | Range queries (`gte` / `lte`) for order size |
| `rate` | `u256` | `87n` | Filter orders by best INR/USDC exchange rate |
| `zkVerified` | `bool` | `true \| false` | Audit filter for cryptographically settled trades |

### Payload Schema (JSON encoded via `jsonToPayload`)
```json
{
  "orderId": "ORD-89412",
  "makerAddress": "0x71C83907A3B7280312384791023910398103989A",
  "usdcAmount": "57.47",
  "syntheticUpiAlias": "merchant01.synth@okicici",
  "createdAt": "2026-10-18T06:30:00.000Z",
  "takerAddress": "0x39F12B29103912039120931209310293102912B",
  "zkProofSummary": {
    "protocol": "zkTLS-Groth16-Poseidon",
    "nullifierHash": "0x29a8f1092830192830192830192830192830192830192830192830192830c901",
    "tlsTranscriptCommitment": "0x88b12e33441a091823019283019283019283019283019283019283019283441a",
    "groth16ProofDigest": "0x77c90122332f091823019283019283019283019283019283019283019283332f"
  },
  "nullifierEntityKey": "0x91d4e2101928301928301928301928301928301928301928301928301928e210"
}
```

### Expiration Policy (`ExpirationTime`)
- **On `OPEN`**: `ExpirationTime.fromMinutes(60)` (prevents stale FX rate exposure).
- **On `LOCKED` (`patchEntity`)**: Refreshed to `ExpirationTime.fromMinutes(30)` (gives Taker a 30-minute window to complete UPI payment and submit the zkTLS proof).
- **On `SETTLED` (`patchEntity`)**: Extended to `ExpirationTime.fromDays(7)` for post-trade auditability before automatic storage reclamation.

---

## 3. Entity Type 2: `utr_nullifier`

Prevents replay attacks where a malicious buyer attempts to reuse the same UPI payment proof across two different `p2p_order` entities.

### Indexed Attributes
| Attribute Key | SDK Type | Example Value | Query Purpose |
| :--- | :--- | :--- | :--- |
| `appId` | `str` | `"zkupi-arkiv-v1"` | Namespace isolation |
| `entityType` | `str` | `"utr_nullifier"` | Nullifier registry lookup |
| `nullifierHash` | `str` | `"0x29a8f1092830192830192830192830192830192830192830192830192830c901"` | $O(1)$ duplicate proof detection before settlement |
| `orderKey` | `str` | `"0x55a10918230192830192830192830192830192830192830192830192830199b2"` | Links nullifier to the settled order entity |

### Payload Schema
```json
{
  "orderKey": "0x55a10918230192830192830192830192830192830192830192830192830199b2",
  "predictedNullifierKey": "0x91d4e2101928301928301928301928301928301928301928301928301928e210",
  "tlsTranscriptCommitment": "0x88b12e33441a...",
  "groth16ProofDigest": "0x77c90122332f...",
  "settledAt": "2026-10-18T06:45:00.000Z"
}
```

### Deterministic Prediction (`predictEntityKey`)
Before submitting the transaction, the taker computes:
```ts
const predictedNullifierKey = predictEntityKey({
  owner: takerWalletAddress,
  nonce: BigInt(zkBundle.nullifierHash.slice(0, 18)),
});
```
If an entity with `predictedNullifierKey` or matching `nullifierHash` exists, the UI and orderbook logic reject the payment immediately.
