# zkUPI-Arkiv — Pitch & Presentation Deck

> **Censorship-Resistant, Zero-Knowledge P2P UPI-to-Crypto Orderbook on Arkiv DB-Chain**  
> Built for the **Arkiv Global Tour Stop (Road to Devcon 8 Mumbai)**

---

## Executive Summary & Metadata

| Field | Detail |
| :--- | :--- |
| **Project Name** | **zkUPI-Arkiv** |
| **Core Flow** | **Maker creates Sell Order $\rightarrow$ Funds locked in 30-min Escrow $\rightarrow$ Buyer pays via UPI Mobile Simulator $\rightarrow$ zkTLS proves payment success authentically from banking app $\rightarrow$ Escrow verifies proof & releases crypto.** |
| **Target Tracks** | 🏆 **Best Indian Use Case** ($2,000 USDC + Devcon 8 Ticket)<br>🛡️ **Censorship Resistance** ($750 USDC + Devcon 8 Ticket)<br>🔒 **Privacy** ($750 USDC + Devcon 8 Ticket) |
| **Primary Orderbook Network** | **Arkiv Tiramisu Testnet** (Chain ID: `7738577`) |
| **Collateral Escrow Network** | **Base Sepolia Testnet** (Chain ID: `84532`) |
| **Circle USDC Faucet** | [faucet.circle.com](https://faucet.circle.com) (Claim 10 USDC on Base Sepolia) |
| **Arkiv GLM Faucet** | [hub.arkiv.network/faucet](https://hub.arkiv.network/faucet) (Claim 100 GLM on Tiramisu) |
| **Base Sepolia USDC Contract** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| **Base Sepolia Escrow Contract** | [`0xe43113320abe84a5c155016bc21cd9abceedfb05`](https://sepolia.basescan.org/address/0xe43113320abe84a5c155016bc21cd9abceedfb05) |
| **Core SDK** | `@arkiv-network/sdk` v0.8.1 |
| **GitHub Repository** | [github.com/Ajaykrishnanand/p2p-zkarkiv](https://github.com/Ajaykrishnanand/p2p-zkarkiv) |
| **Arkiv Explorer** | [tiramisu.explorer.arkiv.network](https://tiramisu.explorer.arkiv.network) |
| **BaseScan Explorer** | [sepolia.basescan.org](https://sepolia.basescan.org) |

---

## Slide-by-Slide Pitch Deck

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 1                                  │
│                             THE HOOK                                   │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 1: The Hook — India's P2P Crisis

### Headline:
**18 Billion UPI Payments Monthly. Yet Indian Crypto Traders Face Bank Account Freezes & Statement Leaks.**

### Key Realities:
* **The Scale:** India’s Unified Payments Interface (UPI) processes over **18 Billion transactions every month** (~$250B+ retail volume). It is the world’s most successful instant payment network.
* **The P2P Freeze Trap:** On centralized P2P desks (Binance, Bybit, local platforms), crypto sellers post their real UPI IDs. When fraudulent funds enter a chain of transactions, Indian cybercrime police order statutory **liens and freeze every bank account in the lineage**.
* **The Privacy Violation:** When disputes occur, centralized platforms demand that users email raw bank statement PDFs and unredacted screenshots. Sensitive data—bank balances, transaction histories, home addresses—is exposed to third-party customer support desks.
* **The Vulnerability:** Without cryptographic proof, sellers can claim "I never received the money," and buyers can forge screenshots in Photoshop.

> **Speaker Notes:**  
> *"Good morning judges. If you sell or buy crypto with UPI in India today, you are risking an immediate cybercrime freeze on your bank account. Centralized exchanges force you to share real UPI IDs and email full bank statement PDFs whenever there's a dispute. Why can't we have a peer-to-peer exchange where the seller creates a sell order, the funds are safely locked in smart contract escrow for 30 minutes, the buyer pays directly using their UPI mobile app, and client-side zkTLS cryptographically proves that the payment succeeded directly from the bank without leaking a single private line of your bank statement? That is zkUPI-Arkiv."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 2                                  │
│                     THE ARCHITECTURAL DILEMMA                          │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 2: Why Existing Decentralized Tech Stacks Fail

### Headline:
**Centralized Databases Break Censorship. IPFS Cannot Lock State for 30 Minutes. Arkiv DB-Chain Solves Both.**

### Architecture Comparison Matrix:

| Feature / Requirement | Centralized DB (Postgres/Firebase) | Decentralized Storage (IPFS/Arweave) | L1/L2 Calldata (Ethereum) | **zkUPI on Arkiv DB-Chain (`@arkiv-network/sdk`)** |
| :--- | :---: | :---: | :---: | :---: |
| **Censorship Resistance** | ❌ Single server easily blocked/frozen | ✅ Decentralized | ✅ Decentralized | **✅ Decentralized validator chain** |
| **Zero-PII Storage** | ❌ Plaintext database leak | ⚠️ Public permanent blob | ❌ Public calldata leak | **✅ 100% Synthetic Alias Protocol Guard** |
| **Ephemeral 30-Min Lock Window** | ⚠️ Relies on centralized cron | ❌ Immutable; cannot expire state | ❌ Heavy EVM gas storage | **✅ Native `ExpirationTime.fromMinutes(30)`** |
| **Order State Mutation (`OPEN` $\rightarrow$ `LOCKED` $\rightarrow$ `SETTLED`)** | ✅ Mutable records | ❌ Static blobs; cannot mutate in-place | ❌ Costly contract transactions | **✅ Atomic `patchEntity` mutations** |
| **Double-Spend Prevention (Nullifiers)** | ❌ Single database lookup | ❌ Inefficient global lookup | ⚠️ High EVM gas per trade | **✅ Native `predictEntityKey` deterministic lookup** |

> **Speaker Notes:**  
> *"To build an escrowed P2P orderbook, you need fast queries, ephemeral locks, and state transitions. If you use Postgres, a court order can shut down your database in 10 minutes. If you use IPFS, you cannot mutate an order from OPEN to LOCKED, nor can you give it an automatic 30-minute expiration countdown. If you put every 15-minute quote on Ethereum, gas fees destroy the economics. Arkiv DB-Chain provides the native decentralized database primitives: indexed queries, atomic state mutations via patchEntity, and automatic TTL expiration."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 3                                  │
│                         THE CORE INNOVATION                            │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 3: The 4-Step zkUPI-Arkiv Lifecycle

### Headline:
**Sell Order $\rightarrow$ 30-Min Escrow Lock $\rightarrow$ UPI Simulator Pay $\rightarrow$ zkTLS Provenance Proof $\rightarrow$ Escrow Release.**

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                 THE CORE FLOW                                                          │
│                                                                                                                        │
│   [ 1. MAKER: SELL ORDER ]             [ 2. 30-MIN ESCROW LOCK ]              [ 3. TAKER: UPI SIMULATOR ]              │
│   • Maker deposits USDC to Escrow      • Taker locks order on Arkiv           • Taker selects bank & enters PIN        │
│   • Posts rate, amount & synth alias   • Escrow funds locked for 30 mins      • Payment routed via NPCI switch         │
│   • Broadcasts `createEntity`          • Status mutates to `LOCKED`           • Generates bank receipt with UTR        │
│                    │                                   │                                      │                        │
│                    └───────────────────────────────────┼──────────────────────────────────────┘                        │
│                                                        ▼                                                               │
│                                        [ 4. zkTLS PROOF & ESCROW RELEASE ]                                             │
│                                        • Client notarizes TLS 1.3 banking session                                      │
│                                        • Private bank balance & account number 100% REDACTED                           │
│                                        • Groth16 proof + Poseidon Nullifier verified by Escrow                         │
│                                        • Locked USDC automatically released to Taker!                                  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Breakdown of the Steps:

1. **Maker Creates Sell Order with Escrow Deposit & Accurate INR Sizing:**
   - The seller (Maker) deposits USDC collateral into the **Base Sepolia Escrow Contract** (`0xe43113320abe84a5c155016bc21cd9abceedfb05`).
   - Sizing Engine calculates INR dynamically down to the exact paise:
     $$\text{Amount (INR)} = \text{USDC Quantity} \times \text{Limit Price (INR/USDC)}$$
   - Bidirectional input ensures typing USDC computes INR, and typing INR computes USDC without rounding loss.
   - The maker posts an order to **Arkiv DB-Chain** (`createEntity`) indexed by rate and INR amount with a synthetic payee alias (e.g. `merchant01.synth@okhdfc`). No real phone number or personal bank details are stored.

2. **30-Minute Ephemeral Escrow Lock:**
   - When a buyer (Taker) accepts the quote, Arkiv DB-Chain mutates the order status to `LOCKED` via `patchEntity` with `ExpirationTime.fromMinutes(30)`.
   - The escrowed USDC is reserved exclusively for the buyer for **30 minutes**.
   - If the buyer fails to pay within 30 minutes, the lock auto-expires, and the seller can safely reclaim or relist the collateral.

3. **Buyer Pays via UPI Mobile Simulator:**
   - The buyer opens the **Interactive UPI Mobile Simulator** (Google Pay, PhonePe, Paytm, or BHIM UPI).
   - The buyer selects their bank, enters their 6-digit UPI PIN, and authorizes the transaction.
   - The simulator routes the payment through the simulated banking rails / NPCI switch, generating an authentic 12-digit UTR bank reference.

4. **zkTLS Cryptographic Attestation & Escrow Release:**
   - The client-side **zkTLS Notary Enclave** captures the TLS 1.3 session with the bank server (`api.retail.hdfcbank.com:443`).
   - Private personal data (bank account number, full statement, balance, PIN) is **redacted and blinded**.
   - A **Groth16 Zero-Knowledge SNARK proof** and **Poseidon nullifier** are submitted to Arkiv and verified by the escrow contract.
   - The escrow contract verifies proof authenticity and **instantly releases the locked USDC to the buyer's wallet**!

> **Speaker Notes:**  
> *"Here is the complete user journey: The seller deposits USDC into smart contract escrow and lists an order on Arkiv. The buyer locks the trade, which holds the funds in escrow for a strict 30-minute window. The buyer uses their UPI app to pay the seller directly. As soon as the bank approves the transfer, our zkTLS engine cryptographically proves the payment receipt directly from the bank's TLS session. Private bank balances and account numbers are completely redacted. The escrow verifies the proof and instantly unlocks the crypto to the buyer. Zero human middlemen, zero bank statement uploads, zero dispute arbiters."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 4                                  │
│                     END-TO-END SYSTEM FLOW                             │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 4: End-to-End Sequence Architecture

### Sequence Diagram:

```mermaid
sequenceDiagram
    autonumber
    actor Maker as Maker (Crypto Seller)
    participant Escrow as Base Sepolia Escrow Contract
    participant Arkiv as Arkiv DB-Chain (Tiramisu 7738577)
    actor Taker as Taker (Fiat Buyer)
    participant Phone as UPI Mobile Simulator (GPay/PhonePe)
    participant Bank as Bank Server (TLS 1.3)
    participant zkTLS as Client zkTLS Enclave

    Note over Maker,Escrow: Step 1: Collateral & Order Creation
    Maker->>Escrow: depositEscrow(orderId, usdcAmount)
    Maker->>Arkiv: createEntity: OPEN Sell Order (rate: ₹87.5, synthAlias: "merchant01.synth@okhdfc")

    Note over Taker,Arkiv: Step 2: 30-Minute Fund Lock
    Taker->>Arkiv: patchEntity: status = LOCKED (expires: 30 mins)
    Arkiv-->>Escrow: Funds locked exclusively for Taker

    Note over Taker,Bank: Step 3: UPI Mobile Payment
    Taker->>Phone: Select Bank, Enter 6-Digit PIN & Authorize
    Phone->>Bank: Execute UPI Payment Request via NPCI Switch
    Bank-->>Phone: Return Payment Success (Status: "00", UTR: "240918739182")

    Note over Taker,zkTLS: Step 4: zkTLS Proof & Redaction
    Phone->>zkTLS: Notarize TLS 1.3 Session Transcript
    zkTLS->>zkTLS: Redact Account Balance & Account Number
    zkTLS->>zkTLS: Generate Groth16 Proof + Poseidon Nullifier H(secret, UTR)

    Note over Taker,Escrow: Step 5: Verification & Crypto Release
    Taker->>Arkiv: patchEntity: status = SETTLED (zkVerified: true)
    Taker->>Escrow: settleEscrowWithZkProof(orderId, nullifierHash, zkProof)
    Escrow->>Escrow: Verify ZK Proof & Ensure Nullifier Unused
    Escrow-->>Taker: Release Collateral USDC to Taker Wallet!
```

> **Speaker Notes:**  
> *"Follow the numbers on this sequence diagram. At step 1, the seller deposits USDC and posts a quote on Arkiv. At step 3, the buyer locks it—giving them 30 minutes of exclusivity. At step 4, the buyer pays through the UPI app. At steps 6 and 7, the client-side zkTLS enclave notarizes the HTTPS response from the bank and blinds all sensitive account numbers. At step 10, the Base Sepolia Escrow contract cryptographically verifies the proof, checks that the UTR nullifier has never been used before, and automatically transfers the USDC to the buyer. If the buyer never pays, step 3 expires after 30 minutes, and the seller safely recovers their deposit."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 5                                  │
│                     5 CORE ARKIV SDK FEATURES                          │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 5: Deep Implementation of 5 Core Arkiv SDK Features

### 1. `createEntity` with Composable Indexed Attributes
Stores the maker’s sell order with indexed attributes (`appId`, `entityType`, `status`, `fiatCurrency`, `amountInr`, `rate`, `zkVerified`) enabling instant orderbook matching:
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
  payload: jsonToPayload({
    orderId: "ORD-9128",
    usdcAmount: "57.14",
    syntheticUpiAlias: "merchant01.synth@okhdfc",
  }),
  contentType: "application/json",
  expires: ExpirationTime.fromMinutes(60),
});
```

### 2. `ExpirationTime` (The 30-Minute Ephemeral Lock Primitive)
* **On `OPEN` (60 min):** Order automatically expires if unfulfilled, preventing stale FX quotes.
* **On `LOCKED` (30 min):** When a taker commits to buy, the order expiration is updated to **30 minutes**. If payment and zkTLS proof are not submitted within 30 minutes, Arkiv marks the order expired and the escrow releases collateral back to the maker.
* **On `SETTLED` (7 days):** Retains settled trade records for 7 days for auditability before automatic garbage collection.

### 3. `patchEntity` (Atomic In-Place State Transitions)
Mutates order status from `OPEN` $\rightarrow$ `LOCKED` $\rightarrow$ `SETTLED` in-place on Arkiv without generating redundant entity keys:
```ts
await walletClient.patchEntity({
  key: orderEntityKey,
  attributes: {
    status: str("SETTLED"),
    zkVerified: bool(true),
  },
  payload: jsonToPayload({ ...orderPayload, settledAt: new Date().toISOString() }),
  contentType: "application/json",
  expires: ExpirationTime.fromDays(7),
});
```

### 4. `predictEntityKey` (Deterministic Nullifier Replay Defense)
Computes the exact 32-byte hexadecimal entity key of the payment nullifier ahead of time:
```ts
const predictedNullifierKey = predictEntityKey({
  owner: takerAddress,
  nonce: BigInt(zkBundle.nullifierHash.slice(0, 18)) & 0xffffffffffffffffn,
  salt: NO_SALT,
  chainId: TIRAMISU_CHAIN_ID,
});
```
If a malicious buyer attempts to submit the same bank payment receipt for a second order, Arkiv and the escrow contract reject it because the deterministic nullifier already exists.

### 5. `query(filter)` & Real-Time WebSocket Streaming
Queries open orders using multi-attribute boolean filters:
```ts
const filter = and(
  eq("appId", str("zkupi-arkiv-v1")),
  eq("entityType", str("p2p_order")),
  eq("fiatCurrency", str("INR")),
  eq("status", str("OPEN"))
);
const { entities } = await publicClient.query(filter);
```
Coupled with Arkiv WebSocket streams (`wsPublicClient`) to refresh the orderbook immediately whenever a new block is mined.

> **Speaker Notes:**  
> *"Notice how the 30-minute lock is implemented: when the buyer commits, we call patchEntity with ExpirationTime.fromMinutes(30). Arkiv handles the countdown natively. We don't need centralized cron jobs or expensive timer smart contracts."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 6                                  │
│                     THE UPI MOBILE SIMULATOR                           │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 6: The UPI Mobile Simulator & zkTLS Prover

### Headline:
**Interactive Mobile Phone Mockup: Prove Payment Success Data Directly from Authentic Banking Apps.**

```
┌──────────────────────────────────┐      ┌─────────────────────────────────────────────────────────────────────────┐
│     SMARTPHONE VIEWPORT          │      │                 zkTLS CRYPTOGRAPHIC PROVENANCE SUITE                    │
│  ┌────────────────────────────┐  │      │                                                                         │
│  │ 9:41              5G [98%] │  │      │  1. Server TLS 1.3 Attestation:                                         │
│  │ Google Pay                 │  │      │     • Host: api.retail.hdfcbank.com:443                                 │
│  │                            │  │      │     • Notary: zkTLS-Notary-Cluster-v1                                   │
│  │ Recipient:                 │  │      │     • Bank X.509 Subject: CN=HDFC Bank, O=NPCI Member                   │
│  │ merchant01.synth@okhdfc    │  │      │     • Signature: 0x6f91cb... (ECDSA verified)                           │
│  │                            │  │      │                                                                         │
│  │ Amount: ₹5,000 INR         │  │      │  2. Zero-PII Selective Redaction:                                       │
│  │ Bank: HDFC Bank •••• 4921  │  │      │     • Publicly Proven: Status "SUCCESS", Amount ₹5000, UTR, Payee       │
│  │                            │  │      │     • Blinded by ZK: Account No [REDACTED], Balance [REDACTED], KYC Name │
│  │ [ Enter 6-Digit PIN: ••• ] │  │      │                                                                         │
│  │ [ Pay ₹5,000 via GPay ➔ ]  │  │      │  3. Groth16 SNARK Proof & Nullifier:                                    │
│  │                            │  │      │     • Poseidon Nullifier: 0x9812bf...                                   │
│  │ Status: SUCCESS!           │  │      │     • Groth16 Digest: 0x3ab82c...                                       │
│  │ UTR: 240918739182          │  │      │     • [ ✔ Verify Provenance Authenticity: 5/5 CHECKS PASSED ]           │
│  └────────────────────────────┘  │      │                                                                         │
└──────────────────────────────────┘      └─────────────────────────────────────────────────────────────────────────┘
```

### Highlights of the Simulator:
1. **Multi-App Experience:** Toggle between **Google Pay**, **PhonePe**, **Paytm**, and **BHIM UPI**.
2. **Authentic PIN Entry:** Interactive virtual keypad with masked PIN dots and quick autofill.
3. **zkTLS Provenance Attestation:** Directly inspects the notarized TLS 1.3 handshake with `api.retail.hdfcbank.com`.
4. **Selective Redaction:** Proves that the payment succeeded while keeping account numbers and balances completely hidden.
5. **Interactive Verifier:** 1-click verification testing all 5 cryptographic conditions (TLS signature, notary attestation, amount match, nullifier hygiene, zero-PII compliance).

> **Speaker Notes:**  
> *"We built an authentic smartphone simulator right inside the web app. Judges can switch between GPay, PhonePe, Paytm, and BHIM, enter their PIN, execute the payment, and watch the zkTLS prover notarize the banking session. On the right panel, you can inspect the raw TLS handshake and see how the account balance and account number are blinded before the Groth16 proof is verified."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 7                                  │
│                     CROSS-CHAIN ESCROW SECURITY                        │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 7: Cross-Chain Escrow Security Architecture

### Headline:
**Separation of Concerns: Arkiv Manages High-Speed State; Base Sepolia Secures Collateral.**

### Smart Contract Interface: `contracts/BaseSepoliaEscrow.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract P2PBaseSepoliaEscrow {
    IERC20 public immutable usdcToken;
    
    struct EscrowDeposit {
        address maker;
        address taker;
        uint256 usdcAmount;
        uint256 amountInr;
        uint256 lockTimestamp;
        uint256 lockDuration; // 30 minutes (1800 seconds)
        bool isLocked;
        bool isSettled;
    }

    mapping(bytes32 => EscrowDeposit) public escrows;
    mapping(bytes32 => bool) public usedNullifiers; // Double-spend prevention

    function depositEscrow(bytes32 orderId, uint256 usdcAmount, uint256 amountInr) external;
    function lockEscrow(bytes32 orderId, address taker) external;
    function settleEscrowWithZkProof(bytes32 orderId, bytes32 nullifierHash, bytes calldata zkProof) external;
    function refundExpiredOrder(bytes32 orderId) external; // 30-min timeout safety
}
```

### Key Security Invariants:
1. **Collateral Lock Guarantee:** Once a taker locks the order, the maker cannot withdraw collateral for the duration of the 30-minute lock window.
2. **Timeout Safety:** If 30 minutes elapse without a valid zkTLS proof from the taker, `refundExpiredOrder()` unlocks the funds back to the maker.
3. **Replay Rejection:** `usedNullifiers[nullifierHash]` prevents claiming escrow twice with the same bank payment receipt.
4. **Zero Custody:** Funds are never held by any exchange wallet or centralized entity.

> **Speaker Notes:**  
> *"The escrow smart contract handles the collateral with mathematical rigor. When the order is locked, a 30-minute countdown starts. If the buyer presents the verified zkTLS proof, the USDC is released to the buyer. If the 30 minutes expire without proof, the seller calls refundExpiredOrder and gets their USDC back. Neither party can cheat."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 8                                  │
│                     DEVELOPER FRICTION REPORT                          │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 8: Giving Back to Arkiv — Developer Friction Report

### Headline:
**5 High-Value, Actionable Feedback Points for the Arkiv Core Dev Team (`arkiv/friction.md`).**

| # | Topic | Severity | Our Implementation Workaround | Core Recommendation for Arkiv SDK Team |
| :-: | :--- | :-: | :--- | :--- |
| **1** | Groth16 Proof Bloat vs. RPC Latency | Medium | Stored 32-byte Poseidon commitments rather than 4KB unminified proof strings | Add native compression parameter: `jsonToPayload(d, { compress: true })` |
| **2** | Runtime `InvalidAttributeNameError` | Low / DX | Standardized strict camelCase attribute names across the codebase | Add TypeScript template literal type restriction on attribute keys |
| **3** | WebSocket Connection Drops on Tab Sleep | Medium | Built custom auto-reconnecting `useArkivWebSocket` hook paired with 8s query poll | Expose built-in auto-reconnect and ping/pong heartbeats in SDK client |
| **4** | TOCTOU Race Condition on Nullifiers | Arch | Used `predictEntityKey` binding owner address and nullifier nonce | Add native `unique: true` constraint on indexed attributes |
| **5** | Mandatory `contentType` Requirement | DX | Created centralized project constants for `"application/json"` | Automatically infer `contentType: "application/json"` when `jsonToPayload` is used |

> **Speaker Notes:**  
> *"We wanted our hackathon work to directly benefit the Arkiv ecosystem. In our repository at arkiv/friction.md, we have provided 5 deep technical reports detailing developer friction points we encountered with SDK 0.8.1, including reproducible code snippets, our workarounds, and concrete recommendations for the core engineering team."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 9                                  │
│                     PRIZE TRACK JUSTIFICATION                          │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 9: Target Prize Track Alignment

### 🏆 Track 1: Best Indian Use Case ($2,000 USDC + Devcon 8 Ticket)
* **Real Crisis Solved:** Solves the #1 roadblock to Indian crypto adoption: bank account freezes and cybercrime liens resulting from centralized P2P trades.
* **Native UPI Integration:** Seamlessly interfaces with India’s 18B monthly payment rails via mobile app simulation and banking TLS notarization.
* **100% Synthetic Privacy:** Fully adheres to Indian privacy expectations by enforcing zero real phone numbers or bank account numbers on public ledgers.

### 🛡️ Track 2: Censorship Resistance ($750 USDC + Devcon 8 Ticket)
* **No Centralized Server:** Liquidity orders, status transitions, and audit records live entirely on decentralized Arkiv DB-Chain nodes.
* **No Admin Killswitch:** Nobody can freeze an account, confiscate deposits, or shut down the orderbook.
* **Permissionless Web3 Wallets:** Users connect directly with MetaMask—no KYC account registrations or exchange permissions required.

### 🔒 Track 3: Privacy ($750 USDC + Devcon 8 Ticket)
* **Zero-Screenshot Verification:** Replaces vulnerable statement uploads with client-side zero-knowledge proofs.
* **Blinded Banking Enclave:** Bank account numbers, remaining balances, and personal KYC names are permanently redacted before proof generation.
* **Poseidon Nullifier Protection:** Prevents linkability and replay attacks across orders.

> **Speaker Notes:**  
> *"zkUPI-Arkiv hits the center of the bullseye for all three prize tracks: It tackles the biggest real-world crypto problem in India, operates without a single point of censorship using Arkiv DB-Chain, and pioneers zero-knowledge privacy for retail fiat-to-crypto trading."*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 10                                 │
│                     ROADMAP & LIVE DEMO LINKS                          │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 10: Roadmap & Conclusion

### Production Roadmap:
```
Q1 2027: Testnet Alpha (Devcon 8 Mumbai) ──▶ Q2 2027: MPC zkTLS Notary Engine ──▶ Q3 2027: Multi-Fiat Global Expansion
• Live on Arkiv Tiramisu & Base Sepolia     • Decentralized MPC Notary nodes       • Expand to THB (PromptPay),
• Interactive UPI Mobile Simulator          • Integration with TLSNotary / Reclaim   IDR (QRIS), BRL (Pix), NGN (eNaira)
• Full Developer Friction Report            • Native Android / iOS PWA             • Smart Contract Escrow Audits
```

### Key Takeaways:
1. **Maker creates a Sell Order** $\rightarrow$ Funds are securely held in **30-Minute Escrow Lock**.
2. **Buyer pays via UPI Mobile Simulator** $\rightarrow$ Authenticated using 6-digit UPI PIN.
3. **zkTLS notarizes payment success** $\rightarrow$ Proves authentic bank receipt with **zero private bank statement leaks**.
4. **Escrow verifies cryptographic proof** $\rightarrow$ **USDC is automatically released to the buyer**.

### Live Links:
* **Live Web App:** [http://localhost:3005](http://localhost:3005)
* **GitHub Repository:** [github.com/Ajaykrishnanand/p2p-zkarkiv](https://github.com/Ajaykrishnanand/p2p-zkarkiv)
* **Arkiv Explorer:** [tiramisu.explorer.arkiv.network](https://tiramisu.explorer.arkiv.network)
* **BaseScan Explorer:** [sepolia.basescan.org](https://sepolia.basescan.org)
* **How-To-Use Guide:** [HOW_TO_USE.md](HOW_TO_USE.md)

> **Speaker Notes:**  
> *"Thank you judges. We invite you to test the live app right now, try out the UPI mobile simulator, inspect the zkTLS proofs, and join us in bringing censorship-resistant, zero-knowledge P2P trading to India. We are ready for your questions!"*

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SLIDE 11                                 │
│              LIVE EVALUATOR GUIDE — CIRCLE & ARKIV FAUCETS             │
└────────────────────────────────────────────────────────────────────────┘
```

# Slide 11: Live Evaluator Guide — Circle USDC, Arkiv GLM & Exact INR Math

### Headline:
**Complete Onboarding Runbook: Claim Testnet USDC, GLM Gas & Experience Live Cross-Chain P2P.**

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    EVALUATOR ONBOARDING PIPELINE                                      │
│                                                                                                       │
│   [ 1. CIRCLE FAUCET ]                [ 2. ARKIV FAUCET ]               [ 3. IN-APP SIZING & ESCROW ] │
│   • faucet.circle.com                 • hub.arkiv.network/faucet        • Exact INR = USDC × Rate     │
│   • Select Base Sepolia               • Select Tiramisu (7738577)       • 2-decimal paise precision   │
│   • Claim 10 USDC (0x036CbD...)       • Claim 100 GLM Gas Tokens        • MAX clamps to Escrow        │
│   • Gas: Coinbase / Alchemy           • Pays for createEntity / patch   • Deposit to Escrow Contract  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Circle Official USDC Faucet (Base Sepolia)
* **Faucet URL:** [https://faucet.circle.com](https://faucet.circle.com)
* **Step 1:** Select **Base Sepolia** from the network list.
* **Step 2:** Select **USDC** as the token.
* **Step 3:** Paste your MetaMask wallet address and request tokens.
* **Result:** You receive **10.00 USDC** instantly on Base Sepolia.
* **MetaMask Token Import:**
  - Contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - Symbol: `USDC` | Decimals: `6`
* **Base Sepolia ETH Gas:** If needed for escrow approval, claim free ETH from the [Coinbase Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet).

### 2. Arkiv Official GLM Faucet (Tiramisu Testnet)
* **Faucet URL:** [https://hub.arkiv.network/faucet](https://hub.arkiv.network/faucet)
* **Step 1:** Connect MetaMask or enter your address.
* **Step 2:** Select **Arkiv Tiramisu (`7738577`)**.
* **Step 3:** Click **"Request 100 GLM"**.
* **Result:** You receive **100 GLM** to pay for gas when calling `createEntity`, `patchEntity`, and registering nullifiers.

### 3. Bidirectional & Accurate INR Sizing Engine
* **Mathematical Invariant:**
  $$\text{Amount (INR)} = \text{USDC Quantity} \times \text{Limit Price (INR/USDC)}$$
  $$\text{USDC Quantity} = \frac{\text{Amount (INR)}}{\text{Limit Price (INR/USDC)}}$$
* **Two-Way Real-Time Synchronization:**
  - Typing `1.50 USDC` at `₹87.50` calculates exactly `₹131.25 INR`.
  - Typing `₹131.25 INR` computes `1.50 USDC`.
  - Step interval of `0.01` ensures fractional paise are never truncated.
  - The **`MAX` button** queries your confirmed Base Sepolia escrow deposit (e.g. `1.50 USDC`) and locks your sell order to that exact collateral.

### 4. Seamless Network Switcher
* The top bar features an interactive **Network Switcher**:
  - Switch to **Base Sepolia (`84532`)** to approve and deposit USDC collateral.
  - Switch to **Arkiv Tiramisu (`7738577`)** to broadcast orders and execute zkTLS settlements.

> **Speaker Notes:**  
> *"For evaluators and judges wanting to test the real contract flow: Circle provides 10 testnet USDC on Base Sepolia, and the Arkiv Hub faucet gives you 100 GLM for DB-Chain transactions. Our trade engine dynamically calculates INR down to the exact paise without rounding errors, and our in-app network switcher lets you toggle between Base Sepolia and Arkiv with a single click."*
