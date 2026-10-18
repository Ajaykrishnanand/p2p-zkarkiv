# zkUPI-Arkiv — Testing & Verification Guide
### Fully Testnet vs. Simulation Delineation & Reproducible Verification Runbook

> **Network Environments:**  
> - **Arkiv Tiramisu Testnet** (Chain ID: `7738577`) — High-Frequency Orderbook & ZK Nullifier Registry  
> - **Base Sepolia Testnet** (Chain ID: `84532`) — Collateralized USDC Escrow  
> - **Client-Side zkTLS Enclave** — Zero-PII Indian Banking Simulator & Groth16 Prover  
> **Last Updated:** October 18, 2026

---

## 1. Executive Summary: What is Live on Testnet vs. What is Simulated

To comply 100% with hackathon competition rules, prevent real personal data leaks, and provide a frictionless 45-second evaluation experience for judges, **zkUPI-Arkiv strictly delineates between on-chain testnet primitives and client-side simulations**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURAL BOUNDARY: TESTNET VS. SIMULATION                  │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ FULLY TESTNET (On-Chain & Verifiable)     │ SIMULATION (Client-Side & Interactive)     │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Arkiv Tiramisu DB-Chain (7738577)       │ • Indian NPCI / Bank UPI Gateway Rails     │
│ • createEntity with 7 Indexed Attributes  │ • 6-Digit Numeric UPI PIN Pad (GPay/Paytm) │
│ • Dynamic ExpirationTime (60m, 30m, 7d)   │ • 900ms Simulated Network Switch Latency   │
│ • patchEntity Atomic State Transitions    │ • Client-Side zkTLS Enclave Redactions     │
│ • predictEntityKey Deterministic Keys     │ • Compact Groth16 Commitment Pipeline      │
│ • query(filter) Composable Node Queries   │ • Zero-Gas Resilient Fallback Mode         │
│ • watchEntityEvents WebSocket RPC         │                                            │
│ • Base Sepolia Escrow Contract (84532)    │                                            │
│ • Circle Native Testnet USDC Collateral   │                                            │
│ • Automated CLI Seeder (seedTiramisu.ts)  │                                            │
│ • Vercel Market Maker Cron Endpoint       │                                            │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. PART 1: The Definitive Component Breakdown

---

### 2.1 FULLY TESTNET: Live On-Chain Components

#### A. Arkiv Tiramisu Testnet (`chainId: 7738577`)
* **Network Status:** Fully operational testnet running on Arkiv DB-Chain validator nodes.
* **Network RPC (HTTP):** `https://rpc.tiramisu.db-chain.testnet.arkiv.network`
* **Network RPC (WSS):** `wss://rpc.tiramisu.db-chain.testnet.arkiv.network`
* **Block Explorer:** [https://tiramisu.explorer.arkiv.network](https://tiramisu.explorer.arkiv.network)
* **SDK Version:** `@arkiv-network/sdk` v0.8.1

**Live On-Chain Primitives Executed:**
1. **`createEntity` (Liquidity Listing):**
   - Transmits an on-chain transaction registering a new `p2p_order` entity on the Tiramisu validator network.
   - Writes 7 indexed attributes directly to the chain:
     * `appId: str("zkupi-arkiv-v1")`
     * `entityType: str("p2p_order")`
     * `status: str("OPEN")`
     * `fiatCurrency: str("INR")`
     * `amountInr: u256(BigInt(amount))`
     * `rate: u256(BigInt(rate))`
     * `zkVerified: bool(false)`
   - Encodes JSON payload containing `orderId`, `makerAddress`, `usdcAmount`, `syntheticUpiAlias`, and `createdAt`.
   - Attaches `contentType: "application/json"`.
   - Sets on-chain `expires: ExpirationTime.fromMinutes(60)`.
2. **`ExpirationTime` (Automated On-Chain Pruning):**
   - Arkiv validators automatically enforce storage reclamation:
     * `OPEN` orders: 60 minutes TTL.
     * `LOCKED` orders: 30 minutes TTL.
     * `SETTLED` orders: 7 days TTL.
3. **`patchEntity` (In-Place State Machine):**
   - Mutates the existing 32-byte hexadecimal entity on Tiramisu without creating duplicate entities or bloating storage.
   - Atomically updates attributes (`status: "LOCKED"` $\rightarrow$ `status: "SETTLED"`, `zkVerified: true`) and refreshes payload data.
4. **`predictEntityKey` (Deterministic On-Chain Nullifier Lookups):**
   - Computes deterministic entity keys on Tiramisu ahead of transaction submission:
     ```ts
     const predictedNullifierKey = predictEntityKey({
       owner: takerAddress,
       nonce: BigInt(zkBundle.nullifierHash.slice(0, 18)) & 0xffffffffffffffffn,
       salt: NO_SALT,
       chainId: 7738577,
     });
     ```
   - Prevents replay attacks by guaranteeing that any duplicate nullifier submission collides or reverts.
5. **`query(filter)` (Composable Boolean Node Queries):**
   - Executes real queries against Arkiv validator nodes using `and()`, `eq()`, `lte()` filters:
     ```ts
     const filter = and(
       eq("appId", str("zkupi-arkiv-v1")),
       eq("entityType", str("p2p_order")),
       eq("fiatCurrency", str("INR")),
       lte("rate", u256(88n))
     );
     const { entities } = await publicClient.query(filter);
     ```
6. **`watchEntityEvents` (WebSocket Streaming):**
   - Connects to `wss://rpc.tiramisu.db-chain.testnet.arkiv.network` to stream live entity creations and mutations in real time.
7. **Automated Seeding CLI (`scripts/seedTiramisu.ts`):**
   - Connects to Tiramisu using private keys configured in `.env` to seed canonical `OPEN`, `LOCKED`, and `SETTLED` orders.
8. **Automated Vercel Keeper (`/api/cron/market-maker`):**
   - Periodic cron endpoint querying live Tiramisu orders and replenishing quotes on-chain.

---

#### B. Base Sepolia Testnet (`chainId: 84532`)
* **Network Status:** Live Ethereum Layer 2 testnet operated by Coinbase.
* **Network RPC:** `https://sepolia.base.org`
* **Block Explorer:** [https://sepolia.basescan.org](https://sepolia.basescan.org)
* **Collateral Asset:** Circle Native Testnet USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)

**Live On-Chain Smart Contract: `contracts/BaseSepoliaEscrow.sol`**
* **Contract Name:** `P2PBaseSepoliaEscrow`
* **Solidity Version:** `^0.8.20`
* **Compiled Artifacts:**
  - Bytecode: [`contracts/build/P2PBaseSepoliaEscrow.bin`](contracts/build/P2PBaseSepoliaEscrow.bin)
  - ABI: [`contracts/build/P2PBaseSepoliaEscrow.abi`](contracts/build/P2PBaseSepoliaEscrow.abi)
* **Key Functions Executed on Base Sepolia:**
  - `depositEscrow(bytes32 orderId, uint256 usdcAmount, uint256 amountInr, bytes32 arkivEntityKey)`: Locks collateral USDC into escrow.
  - `lockEscrow(bytes32 orderId, address taker, uint256 ttlSeconds)`: Sets taker address and payment window.
  - `settleEscrowWithZkProof(bytes32 orderId, bytes32 nullifierHash, bytes calldata zkProof)`: Verifies that `usedNullifiers[nullifierHash]` is false, marks it true, and releases USDC to the taker.
  - `refundExpiredOrder(bytes32 orderId)`: Refunds the maker if the payment window expires without valid settlement.
* **Deployment Automation:** [`scripts/deployBaseSepolia.ts`](scripts/deployBaseSepolia.ts) deploys this contract to Base Sepolia using Viem and automatically records the address in `.env`.

---

### 2.2 SIMULATION: Client-Side & Interactive Components

#### A. Indian Banking Rails & NPCI UPI Switch Simulator
* **Why Simulated?**
  1. **Strict Hackathon Disqualification Gate:** The hackathon rules strictly prohibit storing real personal data, genuine phone numbers, or real Indian VPAs on any public ledger.
  2. **Closed Banking Infrastructure:** Real Indian bank APIs (HDFC, ICICI, SBI, Axis) and NPCI switches require enterprise RBI payment aggregator licenses, biometric authentication, SMS OTP binds, and private banking credentials.
* **What is Simulated in the UI?**
  - **Smartphone UPI Terminal:** In [`src/components/ZkSettlementModal.tsx`](src/components/ZkSettlementModal.tsx), an authentic smartphone mockup allows switching between India's top 4 UPI applications:
    * Google Pay (GPay)
    * PhonePe
    * Paytm
    * BHIM UPI
  - **6-Digit UPI PIN Pad:** Interactive numeric keypad simulating the standard Indian UPI PIN authentication flow.
  - **Simulated NPCI Switch Handshake:** A realistic 900ms async delay mimicking real-time NPCI switch routing between payer bank and payee bank.
  - **Synthetic 12-Digit UTR Generator:** Generates compliant 12-digit Unique Transaction References (`SYNTH-UTR-XXXXXXXXXXXX`) matching Indian banking formats.
  - **Synthetic VPA Routing:** Enforces aliases formatted as `[name].synth@[bank]` (e.g. `arjun.synth@okhdfc`).
* **Production Bridge:** In a production mobile app, the user executes the payment through their normal banking app; the zkTLS client notarizes the HTTPS session directly from the bank's portal.

---

#### B. zkTLS & Groth16 Prover Enclave
* **Why Simulated in the Browser Frontend?**
  1. **Speed & Judge Experience:** Generating a full client-side SnarkJS Groth16 proof inside WebAssembly requires downloading 30MB–50MB of trusted setup parameters (`zkey`), taking 45 to 90 seconds on a laptop. Judges must evaluate projects in under 2 minutes.
  2. **Storage Payload Constraints:** Unminified Groth16 proofs exceed 4KB, causing RPC serialization bloat on public testnets (documented in [`arkiv/friction.md`](arkiv/friction.md)).
* **What is Real vs. Simulated in the Cryptographic Pipeline?**
  - **REAL:** The client constructs a real TLS 1.3 HTTPS response JSON containing headers, amount, payee VPA, and synthetic UTR.
  - **REAL:** Confidential PII fields (`payerAccount`, `remainingBalance`, `personalKycName`) are strictly redacted in client memory with `"REDACTED_BY_ZKTLS_ENCLAVE"`.
  - **REAL:** The client computes a cryptographic Poseidon / SHA-256 nullifier hash $H(\text{secret}, \text{syntheticUtr})$ that binds the payment receipt to the order.
  - **REAL:** The client generates cryptographic commitments (`tlsTranscriptCommitment`, `groth16ProofDigest`, `nullifierHash`) that are stored on Arkiv and passed to Base Sepolia's `settleEscrowWithZkProof`.
  - **SIMULATED:** The 60-second SNARK circuit constraint generation is bypassed in favor of instant client-side commitment derivation, allowing judges to test the cryptographic flow without latency.
* **Production Bridge:** Replace the instant commitment generator with a background WebAssembly TLSNotary prover or Reclaim Protocol SDK.

---

#### C. Zero-Gas Resilient Fallback Mode
* **Why Implemented?**
  - Devcon and hackathon judges often test live application deployments without having acquired testnet gas from Tiramisu faucets or Base Sepolia faucets.
  - Without a fallback, judges would encounter `insufficient funds for gas * price + value` errors and be unable to review the UI, state machine, and data structures.
* **How It Works:**
  - If a wallet client has testnet gas on Tiramisu, transactions broadcast directly to the network.
  - If a transaction throws an `insufficient gas` or `RPC connection` error, the UI catches the error and activates the **Interactive Fallback State**:
    * Generates a deterministic Arkiv entity key matching the exact 32-byte hexadecimal schema.
    * Progresses the order status from `OPEN` $\rightarrow$ `LOCKED` $\rightarrow$ `SETTLED`.
    * Computes real Poseidon nullifiers and displays them in the Raw Arkiv Entity Inspector.
    * Displays a prominent banner informing the tester that the interactive fallback was used.

---

## 3. PART 2: Reproducible Test Suite & Verification Commands

You can run the following test suite locally to verify every layer of the application:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REPRODUCIBLE TEST SUITE                         │
├────────────────────┬─────────────────────────────────┬─────────────────┤
│ Test ID            │ Command                         │ Target Layer    │
├────────────────────┼─────────────────────────────────┼─────────────────┤
│ TEST-01            │ pnpm run compile:contracts      │ Solidity Escrow │
│ TEST-02            │ pnpm run build                  │ Next.js App     │
│ TEST-03            │ pnpm run seed                   │ Arkiv Tiramisu  │
│ TEST-04            │ pnpm run deploy:base            │ Base Sepolia    │
│ TEST-05            │ npx tsx scripts/testGuard.ts    │ Zero-PII Regex  │
│ TEST-06            │ pnpm run dev                    │ Interactive E2E │
└────────────────────┴─────────────────────────────────┴─────────────────┘
```

---

### Test 1: Smart Contract Compilation (`BaseSepoliaEscrow.sol`)
**Objective:** Verify that the cross-chain escrow smart contract compiles cleanly without errors.

```bash
pnpm run compile:contracts
```

**Expected Output:**
```
> p2p-zkarkiv@0.1.0 compile:contracts
> solc --bin --abi contracts/BaseSepoliaEscrow.sol -o contracts/build --overwrite

Compiler run successful. Artifacts written to contracts/build.
```
**Verification:** Inspect [`contracts/build/P2PBaseSepoliaEscrow.bin`](contracts/build/P2PBaseSepoliaEscrow.bin) and [`contracts/build/P2PBaseSepoliaEscrow.abi`](contracts/build/P2PBaseSepoliaEscrow.abi) to confirm generated bytecode.

---

### Test 2: Next.js Production Build & TypeScript Typecheck
**Objective:** Verify that the frontend application, components, and API routes compile with zero TypeScript or ESLint errors.

```bash
pnpm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Generating static pages (5/5)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    135 kB          222 kB
├ ○ /_not-found                          870 B          88.1 kB
└ ƒ /api/cron/market-maker               0 B                0 B
+ First Load JS shared by all            87.2 kB
```

---

### Test 3: Arkiv Tiramisu Seeding Script (`scripts/seedTiramisu.ts`)
**Objective:** Verify that the seeder script successfully connects to Arkiv Tiramisu Testnet, generates burner accounts, and provides funding instructions or seeds entities.

```bash
pnpm run seed
```

**Expected Output:**
```
=================================================
   zkUPI-Arkiv — Tiramisu Testnet Entity Seeder   
=================================================

📡 Wallet Address : 0xeD33ceC51738A7651CeEB609dd70D15D40cFf829
🔗 Network        : Tiramisu Testnet (Chain ID 7738577)
🔍 Explorer       : https://tiramisu.explorer.arkiv.network/address/0xeD33ceC51738A7651CeEB609dd70D15D40cFf829

1️⃣  Creating OPEN P2P Order Entity...
   ✅ Entity Key: 0x...
   📦 Status: OPEN | Amount: ₹5,000 INR | TTL: 60m

2️⃣  Creating & Locking Order Entity...
   ✅ Entity Key: 0x...
   🔒 Status: LOCKED | Amount: ₹15,000 INR

3️⃣  Creating & Settling Order Entity with zkTLS Proof...
   ✅ Order Entity Key     : 0x...
   🛡️  Nullifier Entity Key : 0x...
   ⚡ Status               : SETTLED (zkVerified: true)

🎉 Seeding Completed Successfully on Tiramisu Testnet!
```
*(Note: If the burner address has zero testnet gas, the script outputs clear instructions and faucet links for funding).*

---

### Test 4: Base Sepolia Escrow Deployer (`scripts/deployBaseSepolia.ts`)
**Objective:** Verify that the deployment script connects to Base Sepolia (84532), checks ETH balances, and broadcasts contract deployment when funded.

```bash
pnpm run deploy:base
```

**Expected Output:**
```
========================================================
  zkUPI-Arkiv — Base Sepolia Escrow Deployer (84532)   
========================================================

📡 Deployer Address : 0xeD33ceC51738A7651CeEB609dd70D15D40cFf829
🔗 Target Network    : Base Sepolia (Chain ID 84532)
🪙 Collateral USDC   : 0x036CbD53842c5426634e7929541eC2318f3dCF7e
🔍 BaseScan Explorer : https://sepolia.basescan.org/address/0xeD33ceC51738A7651CeEB609dd70D15D40cFf829
```
*(If unfunded, the script provides 4 direct faucet URLs for Base Sepolia testnet ETH).*

---

### Test 5: Zero-PII Regex Guard Unit Test
**Objective:** Verify that `assertSyntheticUpi()` strictly rejects real Indian phone numbers, genuine VPAs, and non-synthetic aliases.

Run the quick inline test:
```bash
npx tsx -e '
import { assertSyntheticUpi, isSyntheticUpi } from "./src/lib/syntheticGuard";

// Test 1: Real phone number VPA must be rejected
try {
  assertSyntheticUpi("9876543210@paytm");
  console.error("FAIL: Real phone number was not rejected!");
} catch (e) {
  console.log("PASS: Real phone number VPA was blocked.");
}

// Test 2: Real personal name VPA must be rejected
try {
  assertSyntheticUpi("rahulsharma@okaxis");
  console.error("FAIL: Real personal VPA was not rejected!");
} catch (e) {
  console.log("PASS: Real personal VPA was blocked.");
}

// Test 3: Synthetic VPA must be accepted
try {
  assertSyntheticUpi("arjun.synth@okhdfc");
  console.log("PASS: Synthetic VPA (arjun.synth@okhdfc) accepted.");
} catch (e) {
  console.error("FAIL: Synthetic VPA was rejected!");
}
'
```

**Expected Output:**
```
PASS: Real phone number VPA was blocked.
PASS: Real personal VPA was blocked.
PASS: Synthetic VPA (arjun.synth@okhdfc) accepted.
```

---

## 4. PART 3: The 45-Second Judge End-to-End Verification Runbook

Follow these exact steps in your browser to evaluate the complete system in under 45 seconds:

### Step 1: Launch the Local App
```bash
pnpm dev
```
Open **[http://localhost:3005](http://localhost:3005)** in your browser.

---

### Step 2: Observe the 1-Click Judge Evaluation Banner
At the top of the terminal, locate the banner titled **"45-Second Judge Evaluation Flow"** with 3 numbered steps.

#### Action 1: Click "1. Post Order on Arkiv"
* **What happens:** 
  - Calls `createP2POrder()` on `@arkiv-network/sdk`.
  - Sets 7 indexed attributes (`appId`, `entityType`, `status: OPEN`, `fiatCurrency: INR`, `amountInr: 5000`, `rate: 87`, `zkVerified: false`).
  - Sets on-chain `ExpirationTime.fromMinutes(60)`.
* **Verification:**
  - Status message updates to: `Created Entity Key: 0x...`
  - Step 2 button activates with green indicator.
  - The order appears at the top of the Live Orderbook table.

---

### Step 3: Lock Order as Buyer
#### Action 2: Click "2. Lock Order (Buyer)"
* **What happens:**
  - Executes `patchEntity()` on the existing Arkiv entity key.
  - Mutates attribute `status: str("LOCKED")`.
  - Resets on-chain `ExpirationTime` to 30 minutes for the payment window.
* **Verification:**
  - Status message updates: `Order locked (30m Ephemeral TTL active • Ready for UPI Simulator)`.
  - Step 3 button activates with glowing indicator.
  - The order status badge in the orderbook switches from **OPEN (Green)** to **LOCKED (Amber)**.

---

### Step 4: UPI Payment & zkTLS Settlement
#### Action 3: Click "3. zkTLS Pay & Settle"
* **What happens:**
  - Opens the **ZkSettlementModal**:
    1. **UPI Simulator Screen:** Choose app (Google Pay / PhonePe / Paytm / BHIM) $\rightarrow$ enter 6-digit PIN on numeric keypad $\rightarrow$ click **"Pay ₹5,000 INR"**.
    2. **Simulated Handshake:** 900ms async routing generates a synthetic 12-digit UTR (`SYNTH-UTR-...`).
    3. **zkTLS Transcript Inspection:** Displays the TLS 1.3 JSON response with bank balance and account number stamped with `"REDACTED_BY_ZKTLS_ENCLAVE"`.
    4. **Generate Proof:** Click **"Generate Groth16 zkTLS Proof"** to compute Poseidon nullifier hash.
    5. **Settle on Arkiv:** Click **"Settle on Arkiv DB-Chain & Release USDC"**.
* **Verification:**
  - Calls `predictEntityKey` to deterministically verify nullifier uniqueness.
  - Registers `utr_nullifier` entity on Arkiv.
  - Mutates order entity via `patchEntity` to `status: str("SETTLED")`, `zkVerified: bool(true)`, with a 7-day TTL.
  - Success screen displays the 32-byte hexadecimal Arkiv Entity Key, explorer link, and BaseScan escrow link.

---

### Step 5: Inspect Raw Arkiv Entity Key
* On any card in the Live Orderbook, click the **"Raw Entity"** button.
* A slide-out drawer opens showing:
  - **Entity Key:** Full 32-byte hexadecimal hash (e.g. `0x8b4f...`).
  - **Indexed Attributes:** `appId`, `entityType`, `status`, `amountInr`, `rate`, `zkVerified`.
  - **Decoded Payload:** `orderId`, `makerAddress`, `syntheticUpiAlias`, `zkProofSummary`.
  - **TTL Countdown:** Remaining minutes before automated Arkiv validator pruning.
  - **Explorer Link:** 1-click link to [https://tiramisu.explorer.arkiv.network](https://tiramisu.explorer.arkiv.network).

---

## 5. PART 4: Test Case Matrix

| Test Case ID | Test Objective | Test Environment | Expected Result | Pass / Fail Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **TC-101** | Zero-PII Regex Gate | Local Runtime | Blocks real phone number (`9876543210@upi`) | Throws `Security Gate Error` |
| **TC-102** | Synthetic VPA Acceptance | Local Runtime | Accepts `arjun.synth@okhdfc` | Returns `true` |
| **TC-103** | Arkiv Entity Creation | Tiramisu (7738577) | Returns 32-byte entity key with 60m TTL | Entity queryable via RPC |
| **TC-104** | Indexed Attribute Query | Tiramisu (7738577) | Filters orders where `rate <= 88` | Returns matching entities |
| **TC-105** | State Mutation (`patchEntity`) | Tiramisu (7738577) | Mutates status from `OPEN` to `LOCKED` | Status attribute updated in-place |
| **TC-106** | Deterministic Key Derivation | Tiramisu (7738577) | `predictEntityKey` produces consistent key | Same key generated for same owner+nonce |
| **TC-107** | Solc Escrow Compilation | Local solc | Generates `.bin` and `.abi` artifacts | Zero compiler errors |
| **TC-108** | Production Build & Lint | Next.js 14 Engine | Produces optimized static/dynamic routes | Zero TypeScript/ESLint errors |
| **TC-109** | 45s Judge Demo End-to-End | Browser Client | Progresses from Step 1 $\rightarrow$ Step 2 $\rightarrow$ Step 3 | Settle modal completes with success screen |
| **TC-110** | Zero-Gas Fallback Resilience | Browser Client | Allows testing without external faucet gas | UI completes lifecycle without unhandled error |
