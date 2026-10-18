# zkUPI-Arkiv — Censorship-Resistant, Zero-Knowledge P2P UPI Orderbook on Arkiv

[![Tiramisu Testnet](https://img.shields.io/badge/Network-Tiramisu%20Testnet%20(7738577)-059669?style=flat-square)](https://tiramisu.explorer.arkiv.network)
[![Arkiv SDK](https://img.shields.io/badge/@arkiv--network/sdk-v0.8.1-10b981?style=flat-square)](https://www.npmjs.com/package/@arkiv-network/sdk)
[![Zero PII](https://img.shields.io/badge/Privacy-100%25%20Synthetic%20Zero--PII-3b82f6?style=flat-square)](#zero-pii-guarantee)
[![License](https://img.shields.io/badge/License-MIT-zinc?style=flat-square)](LICENSE)

> Built for the **Arkiv Global Tour Stop (Road to Devcon 8 Mumbai)**.  
> Targeting:
> - 🏆 **Best Indian Use Case** ($2,000 USDC + Devcon 8 Ticket)
> - 🛡️ **Censorship Resistance (Global)** ($750 USDC + Devcon 8 Ticket)
> - 🔒 **Privacy (Global)** ($750 USDC + Devcon 8 Ticket)

---

## 1. The Problem: India's P2P Crisis & Centralized Vulnerabilities

In India, over **18 billion UPI transactions** occur monthly. However, crypto P2P traders face catastrophic operational risks on centralized platforms (Binance P2P, local exchanges):

1. **Mass VPA Scraping & Malicious Account Freezes:** Malicious bots harvest public merchant VPAs from orderbooks and trigger cybercrime lien freezes on innocent merchants' personal bank accounts.
2. **Bank Statement Leaks:** Traditional P2P platforms require buyers to upload raw bank statement PDFs or account screenshots to support tickets, exposing lifetime account balances, home addresses, and banking history to third parties.
3. **Platform Censorship & Single Point of Failure:** Centralized matching engines regularly go offline, de-platform users without recourse, or leak unencrypted KYC records.

---

## 2. How zkUPI-Arkiv Solves It

### A. Zero Real PII on Arkiv DB-Chain
Under no circumstances are real mobile numbers, real bank accounts, or genuine UPI VPAs written to Arkiv—neither in plaintext nor hashed. All orders strictly enforce synthetic routing aliases:
- Format: `[alias].synth@[bank]` (e.g., `rahul.synth@okaxis`, `arjun.synth@okhdfc`)
- Real Indian 10-digit mobile number patterns are rejected at the protocol layer via `assertSyntheticUpi()`.

### B. Zero-Screenshot zkTLS Payment Proofs
Instead of uploading easily forged screenshots or leaking full bank statements, the buyer executes a client-side **zkTLS Notarized Session (TLS 1.3)**:
- Proves:
  $$\text{BankStatus} == \text{"SUCCESS"} \land \text{Amount} == \text{Order.amountInr} \land \text{Nullifier} == H(\text{secret}, \text{syntheticUtr})$$
- Sensitive information (payer bank balance, account number, real VPA) is **strictly redacted in ephemeral client memory**. Only cryptographic commitments touch Arkiv.

### C. Why Arkiv DB-Chain?
| Architecture | Why it Fails for Decentralized P2P | How Arkiv Excels |
| :--- | :--- | :--- |
| **PostgreSQL / Centralized DB** | Single point of failure; honeypot for PII; easily blocked by authorities. | Completely decentralized; censorship-resistant state machine. |
| **IPFS / Arweave** | Static blobs cannot be queried by `status == "OPEN"` or `rate <= 88`, cannot be updated when locked/settled, and cannot auto-prune expired quotes. | Native indexed query filters (`eq`, `lte`), mutable `patchEntity`, and automatic TTL pruning (`ExpirationTime`). |
| **Ethereum Subgraph** | Read-only indexer; requires deploying expensive EVM smart contracts just to store ephemeral 15-minute orderbook states. | Native database chain with sub-second writes and no smart contract deployment overhead for order state. |

---

## 3. Mandatory Gate Files

1. **[Arkiv Schema Specification (`arkiv/schema.md`)](arkiv/schema.md):** Complete indexed attribute types (`str`, `u256`, `bool`), payload JSON schemas, and TTL lifecycle policies.
2. **[Developer Friction Report (`arkiv/friction.md`)](arkiv/friction.md):** 5 detailed, reproducible friction points with `@arkiv-network/sdk` v0.8.1 on Tiramisu Testnet.

---

## 4. Deep Demonstration of 5 Core Arkiv Features

### 1. `createEntity` with Indexed Attributes & Content-Type
Posts a new liquidity quote indexed by `appId`, `entityType`, `status`, `fiatCurrency`, `amountInr`, `rate`, and `zkVerified`:
```ts
const tx = await walletClient.createEntity({
  attributes: {
    appId: str("zkupi-arkiv-v1"),
    entityType: str("p2p_order"),
    status: str("OPEN"),
    fiatCurrency: str("INR"),
    amountInr: u256(5000n),
    rate: u256(87n),
    zkVerified: bool(false),
  },
  payload: jsonToPayload({ orderId: "ORD-12345", usdcAmount: "57.47", syntheticUpiAlias: "merchant.synth@okhdfc" }),
  contentType: "application/json",
  expires: ExpirationTime.fromMinutes(60),
});
```

### 2. `ExpirationTime` (Auto-Expiring Orderbook Quotes)
- **On `OPEN`:** 60-minute TTL prevents stale FX rate exposure.
- **On `LOCKED`:** 30-minute lock window for UPI transfer completion.
- **On `SETTLED`:** 7-day retention for post-trade auditability before automatic network storage reclamation.

### 3. `predictEntityKey` (Deterministic ZK Nullifiers)
Prevents replay attacks where a buyer tries to claim multiple orders with the same UPI payment receipt:
```ts
const predictedNullifierKey = predictEntityKey({
  owner: takerAddress,
  nonce: BigInt(zkBundle.nullifierHash.slice(0, 18)) & 0xffffffffffffffffn,
  salt: NO_SALT,
  chainId: TIRAMISU_CHAIN_ID,
});
```

### 4. `patchEntity` (Atomic State Machine Transitions)
Mutates status from `OPEN` $\rightarrow$ `LOCKED` $\rightarrow$ `SETTLED` without recreating or bloating entity keys:
```ts
await walletClient.patchEntity({
  key: orderEntityKey,
  attributes: { status: str("SETTLED"), zkVerified: bool(true) },
  payload: jsonToPayload({ ...orderPayload, settledAt: new Date().toISOString() }),
  contentType: "application/json",
  expires: ExpirationTime.fromDays(7),
});
```

### 5. `query(filter)` and Real-Time Hybrid Orderbook Sync
Queries active orders directly from Arkiv validator nodes using composable boolean filters:
```ts
const filter = and(
  eq("appId", str("zkupi-arkiv-v1")),
  eq("entityType", str("p2p_order")),
  eq("fiatCurrency", str("INR")),
  lte("rate", u256(88n))
);

const { entities } = await publicClient.query(filter);
```

---

## 5. 45-Second Judge Evaluation Flow

The user interface includes a dedicated **1-Click Judge Demo Mode**:
1. **Start the app:**
   ```bash
   pnpm install
   pnpm dev
   ```
2. Open [http://localhost:3005](http://localhost:3005).
3. Follow the 3 numbered steps in the top banner:
   - **Step 1:** Click **"Post Order on Arkiv"** (`createEntity` + 60m TTL).
   - **Step 2:** Click **"Lock Order (Buyer)"** (`patchEntity` + 30m lock).
   - **Step 3:** Click **"Generate ZK Proof & Settle"** (computes Poseidon nullifier, calls `predictEntityKey`, and settles trade).
4. Click **"Raw Entity"** on any card to inspect the on-chain 32-byte hexadecimal key, indexed attributes, and decoded JSON payload in real time.

---

## 6. Network Configuration Reference

- **Network:** Tiramisu Testnet
- **Chain ID:** `7738577`
- **HTTP RPC:** `https://rpc.tiramisu.db-chain.testnet.arkiv.network`
- **WebSocket RPC:** `wss://rpc.tiramisu.db-chain.testnet.arkiv.network`
- **Arkiv Explorer:** `https://tiramisu.explorer.arkiv.network`
- **GitHub Repository:** `https://github.com/Ajaykrishnanand/p2p-zkarkiv`
