# zkUPI-Arkiv — Master Task & Execution Matrix

> **Project:** zkUPI-Arkiv — Censorship-Resistant, Zero-Knowledge P2P UPI Orderbook on Arkiv DB-Chain  
> **Status:** ✅ Core MVP & 5 Arkiv Features Completed | 🚀 Live on Tiramisu & Base Sepolia  
> **Last Updated:** October 18, 2026

---

## 1. Executive Progress Dashboard

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PROJECT PROGRESS OVERVIEW                       │
├──────────────────────────┬───────────┬───────────────┬─────────────────┤
│ Domain                   │ Tasks     │ Completed     │ Progress        │
├──────────────────────────┼───────────┼───────────────┼─────────────────┤
│ 1. Architecture & Gates  │ 5         │ 5             │ [██████████]100%│
│ 2. Arkiv DB-Chain SDK    │ 6         │ 6             │ [██████████]100%│
│ 3. zkTLS & ZK Proofs     │ 5         │ 5             │ [██████████]100%│
│ 4. Cross-Chain Escrow    │ 5         │ 5             │ [██████████]100%│
│ 5. Pro Exchange Frontend │ 10        │ 10            │ [██████████]100%│
│ 6. UPI Simulator & Judge │ 5         │ 5             │ [██████████]100%│
│ 7. Keepers & Seeding     │ 4         │ 4             │ [██████████]100%│
│ 8. Testing & Artifacts   │ 6         │ 6             │ [██████████]100%│
├──────────────────────────┼───────────┼───────────────┼─────────────────┤
│ TOTAL                    │ 46 Tasks  │ 46 Completed  │ [██████████]100%│
└──────────────────────────┴───────────┴───────────────┴─────────────────┘
```

---

## 2. Detailed Work Breakdown Structure (WBS)

### Phase 1: Core Architecture & Hackathon Gated Standards
*Strict compliance with the hackathon rules and non-negotiable disqualification gates.*

- [x] **TASK-101: Zero-PII Protocol Guard Implementation**
  - **File:** [`src/lib/syntheticGuard.ts`](src/lib/syntheticGuard.ts)
  - **Functions:** `assertSyntheticUpi()`, `generateSyntheticUpi()`, `generateSyntheticUtr()`, `isSyntheticUpi()`
  - **Details:** Rejects real Indian 10-digit mobile phone numbers and non-synthetic VPAs. Enforces `[name].synth@[bank]` or `[name].demo@[bank]` pattern.
  - **Verification:** Unit tested against real and synthetic UPI strings; throws explicit error if real PII pattern is detected.

- [x] **TASK-102: Mandatory Arkiv Schema Specification**
  - **File:** [`arkiv/schema.md`](arkiv/schema.md)
  - **Details:** Full entity specification for `p2p_order` and `utr_nullifier`, attribute types (`str`, `u256`, `bool`), payload JSON schema, and TTL policies.
  - **Verification:** Reviewed against `@arkiv-network/sdk` v0.8.1 specifications.

- [x] **TASK-103: Developer Friction Report**
  - **File:** [`arkiv/friction.md`](arkiv/friction.md)
  - **Details:** Detailed telemetry report highlighting 5 critical developer friction points (Groth16 payload size constraints, `InvalidAttributeNameError` runtime exceptions, WebSocket dropouts, TOCTOU nullifier checks, mandatory `contentType`).
  - **Verification:** Contains reproducible code snippets, workarounds, and concrete recommendations for the Arkiv team.

- [x] **TASK-104: Open-Source MIT Licensing**
  - **File:** [`LICENSE`](LICENSE)
  - **Details:** Added permissive standard MIT license for open-source distribution.

- [x] **TASK-105: Comprehensive Submission Documentation**
  - **File:** [`README.md`](README.md)
  - **Details:** Answers all 4 rubric criteria, network endpoints, core feature breakdowns, and reproducible verification steps.

---

### Phase 2: Arkiv DB-Chain SDK (v0.8.1) Integration
*Full utilization of all 5 required Arkiv features on Tiramisu Testnet (`chainId: 7738577`).*

- [x] **TASK-201: Public & Wallet Client Factory**
  - **File:** [`src/lib/arkivClient.ts`](src/lib/arkivClient.ts)
  - **Functions:** `createPublicClient()`, `getBurnerWalletClient()`, `getBrowserWalletClient()`, `getOrCreateDemoPrivateKey()`
  - **Details:** Configured HTTP RPC (`https://rpc.tiramisu.db-chain.testnet.arkiv.network`) and WSS RPC (`wss://rpc.tiramisu.db-chain.testnet.arkiv.network`). Integrated automatic persistent burner wallet generation for seamless judge access.

- [x] **TASK-202: Feature 1 — `createEntity` with Indexed Attributes & Content-Type**
  - **File:** [`src/lib/arkivOrderbook.ts`](src/lib/arkivOrderbook.ts#L80-L120)
  - **Function:** `createP2POrder()`
  - **Indexed Attributes:** `appId` (`str`), `entityType` (`str`), `status` (`str`), `fiatCurrency` (`str`), `amountInr` (`u256`), `rate` (`u256`), `zkVerified` (`bool`).
  - **Payload:** `orderId`, `makerAddress`, `usdcAmount`, `syntheticUpiAlias`, `createdAt`.
  - **TTL:** `ExpirationTime.fromMinutes(60)`.
  - **Content-Type:** `application/json`.

- [x] **TASK-203: Feature 2 — Dynamic `ExpirationTime` Lifecycle Management**
  - **Files:** [`src/lib/arkivOrderbook.ts`](src/lib/arkivOrderbook.ts), [`arkiv/schema.md`](arkiv/schema.md)
  - **Rules:**
    - On `OPEN`: 60 minutes TTL to prevent stale FX rate exposure.
    - On `LOCKED`: Refreshed to 30 minutes ephemeral lock for UPI transfer completion.
    - On `SETTLED`: Extended to 7 days for post-trade auditability before storage reclamation.

- [x] **TASK-204: Feature 3 — Deterministic Nullifiers via `predictEntityKey`**
  - **File:** [`src/lib/arkivOrderbook.ts`](src/lib/arkivOrderbook.ts#L180-L240)
  - **Function:** `predictEntityKey()`
  - **Details:** Predicts deterministic 32-byte hexadecimal entity keys for `utr_nullifier` entities based on taker address, chain ID (7738577), and nullifier nonce. Prevents double-spend replays before transaction submission.

- [x] **TASK-205: Feature 4 — State Machine Transitions via `patchEntity`**
  - **File:** [`src/lib/arkivOrderbook.ts`](src/lib/arkivOrderbook.ts#L155-L255)
  - **Functions:** `lockP2POrder()`, `settleOrderWithZkTlsProof()`
  - **Details:** Atomically transitions order status `OPEN` $\rightarrow$ `LOCKED` $\rightarrow$ `SETTLED` without creating new entity keys or fragmenting storage.

- [x] **TASK-206: Feature 5 — Composable Queries & Real-Time Sync**
  - **Files:** [`src/lib/arkivOrderbook.ts`](src/lib/arkivOrderbook.ts#L125-L150), [`src/components/LiveOrderbook.tsx`](src/components/LiveOrderbook.tsx)
  - **Functions:** `queryOpenInrOrders()`, `watchOrderbookEvents()`
  - **Details:** Uses `@arkiv-network/sdk/query` operators (`and`, `eq`, `lte`) for sub-second queries. Pairs WSS `watchEntityEvents` with an 8-second query poll for bulletproof real-time synchronization.

---

### Phase 3: Zero-Knowledge & zkTLS Payment Proof Engine
*Client-side cryptographic notarization replacing bank statements and screenshots.*

- [x] **TASK-301: TLS 1.3 Bank Session Notarization Simulator**
  - **File:** [`src/lib/zkTlsProver.ts`](src/lib/zkTlsProver.ts#L35-L60)
  - **Function:** `simulateBankTlsSession()`
  - **Details:** Simulates HTTPS TLS 1.3 responses from NPCI / Indian bank endpoints containing HTTP headers, JSON response (`status: SUCCESS`, `amount`, `payeeVpa`, `utr`), and server certificates.

- [x] **TASK-302: Client-Side Ephemeral PII Redaction**
  - **File:** [`src/lib/zkTlsProver.ts`](src/lib/zkTlsProver.ts#L48-L58)
  - **Details:** Permanently redacts payer bank balance (`REDACTED_BY_ZKTLS_ENCLAVE`), sender account number, and KYC holder name inside client memory before proof calculation.

- [x] **TASK-303: Poseidon Nullifier Hash Generation**
  - **File:** [`src/lib/zkTlsProver.ts`](src/lib/zkTlsProver.ts#L65-L85)
  - **Details:** Computes Poseidon nullifier hash $H(\text{secretKey}, \text{syntheticUtr})$ to bind the payment receipt to a unique nullifier entity without revealing the underlying UTR.

- [x] **TASK-304: Groth16 Proof Digest & Commitment Pipeline**
  - **File:** [`src/lib/zkTlsProver.ts`](src/lib/zkTlsProver.ts#L88-L115)
  - **Function:** `generateZkTlsProof()`
  - **Details:** Generates compact cryptographic commitments (`tlsTranscriptCommitment`, `groth16ProofDigest`, `nullifierHash`) fitting within Arkiv RPC payload budgets.

- [x] **TASK-305: Verification & Tamper Resistance**
  - **File:** [`src/lib/zkTlsProver.ts`](src/lib/zkTlsProver.ts#L118-L135)
  - **Function:** `verifyZkTlsProofDigest()`
  - **Details:** Verifies public commitments and ensures that tampered payloads are rejected before submission.

---

### Phase 4: Cross-Chain Escrow on Base Sepolia
*Collateralized USDC Escrow smart contract on Base Sepolia (`chainId: 84532`).*

- [x] **TASK-401: Solidity Escrow Contract Design**
  - **File:** [`contracts/BaseSepoliaEscrow.sol`](contracts/BaseSepoliaEscrow.sol)
  - **Contract:** `P2PBaseSepoliaEscrow`
  - **Methods:**
    - `depositEscrow(orderId, usdcAmount, amountInr, arkivEntityKey)`: Locks maker USDC into contract.
    - `lockEscrow(orderId, taker, ttlSeconds)`: Sets taker address and lock expiry.
    - `settleEscrowWithZkProof(orderId, nullifierHash, zkProof)`: Verifies nullifier uniqueness and releases USDC to taker.
    - `refundExpiredOrder(orderId)`: Allows maker to safely retrieve USDC if lock window expires.
  - **Events:** `OrderDeposited`, `OrderLocked`, `OrderSettled`, `OrderRefunded`.

- [x] **TASK-402: Solc Compilation Pipeline**
  - **Command:** `pnpm run compile:contracts`
  - **Artifacts:** [`contracts/build/P2PBaseSepoliaEscrow.bin`](contracts/build), [`contracts/build/P2PBaseSepoliaEscrow.abi`](contracts/build)
  - **Status:** Verified cleanly compiling with solc 0.8.20+.

- [x] **TASK-403: Automated Base Sepolia Deployment Script**
  - **File:** [`scripts/deployBaseSepolia.ts`](scripts/deployBaseSepolia.ts)
  - **Details:** Viem-based deployer script checking balance, funding instructions, broadcasting deployment transaction, waiting for receipt, and updating `.env`.

- [x] **TASK-404: Frontend Base Sepolia Client Integration**
  - **File:** [`src/lib/baseEscrowClient.ts`](src/lib/baseEscrowClient.ts)
  - **Constants:** `BASE_SEPOLIA_CHAIN_ID = 84532`, `BASE_SEPOLIA_USDC_ADDRESS`, `BASE_SEPOLIA_ESCROW_ADDRESS`, `BASE_SEPOLIA_ESCROW_ABI`.
  - **Helpers:** `getBaseScanTxUrl()`, `getBaseScanAddressUrl()`.

- [x] **TASK-405: Replay & Double-Spend Protection**
  - **File:** [`contracts/BaseSepoliaEscrow.sol`](contracts/BaseSepoliaEscrow.sol#L44-L45)
  - **Details:** Contract maintains `mapping(bytes32 => bool) public usedNullifiers` that mirrors Arkiv's `utr_nullifier` entity registry.

---

### Phase 5: Professional Crypto Exchange UI / Trading Terminal
*High-density, responsive, financial-grade trading terminal built in Next.js 14 App Router.*

- [x] **TASK-501: Slim Navigation Rail**
  - **File:** [`src/components/LeftNavigationRail.tsx`](src/components/LeftNavigationRail.tsx)
  - **Details:** Icon navigation rail featuring Terminal, Markets, History, Analytics, Security, and Docs links.

- [x] **TASK-502: Top Header & Network Status Bar**
  - **File:** [`src/components/Navbar.tsx`](src/components/Navbar.tsx)
  - **Details:** Real-time Tiramisu status, 24h INR/USDC ticker, 24h high/low, orderbook volume, burner wallet indicator, and MetaMask connect button.

- [x] **TASK-503: High-Performance Candlestick Chart**
  - **File:** [`src/components/PriceChart.tsx`](src/components/PriceChart.tsx)
  - **Details:** Dynamic candlestick chart showing INR/USDC price action, volume histogram, timeframe selector (1m, 5m, 15m, 1h, 1D), and tooltip crosshairs.

- [x] **TASK-504: L2 Orderbook Depth & Spread Terminal**
  - **File:** [`src/components/OrderBookTerminal.tsx`](src/components/OrderBookTerminal.tsx)
  - **Details:** Dual-sided orderbook with Asks (red) and Bids (green), cumulative volume depth bars, spread calculation, and 1-click price selection.

- [x] **TASK-505: Trade Execution & Maker Panel**
  - **File:** [`src/components/TradeExecutionPanel.tsx`](src/components/TradeExecutionPanel.tsx)
  - **Details:** Buy/Sell tabs, quick amount buttons (₹1k, ₹5k, ₹10k, ₹50k), synthetic alias selector, TTL slider, and instant order creation.

- [x] **TASK-506: Live P2P Orders Table with Status Badges**
  - **File:** [`src/components/LiveOrderbook.tsx`](src/components/LiveOrderbook.tsx)
  - **Details:** Filters for All, Open, Locked, Settled, and High-Rated orders. Action buttons to Lock, Settle, or Inspect raw entity keys.

- [x] **TASK-507: Raw Arkiv Entity Inspector Drawer**
  - **File:** [`src/components/ExplorerInspector.tsx`](src/components/ExplorerInspector.tsx)
  - **Details:** Slide-out JSON inspector displaying 32-byte hexadecimal entity keys, indexed attributes, decoded JSON payload, TTL countdown, and direct link to Tiramisu Explorer.

- [x] **TASK-508: Main Terminal Page Layout**
  - **File:** [`src/app/page.tsx`](src/app/page.tsx)
  - **Details:** Coordinates all terminal components, manages burner and MetaMask signers, orchestrates polling and event streaming, and houses the 45-second judge demo flow.

- [x] **TASK-509: Real-Time Arkiv WebSocket RPC & Webhook Listener**
  - **File:** [`src/lib/useArkivWebSocket.ts`](src/lib/useArkivWebSocket.ts), [`src/app/api/arkiv/webhook/route.ts`](src/app/api/arkiv/webhook/route.ts)
  - **Details:** Direct WSS connection to `wss://rpc.tiramisu.db-chain.testnet.arkiv.network` with auto-reconnect, live block number streaming, and dedicated HTTP POST/GET webhook listener for order/transaction failure callbacks.

- [x] **TASK-510: Failed Transaction Card & Diagnostic at Bottom of Buy Order**
  - **File:** [`src/components/TradeExecutionPanel.tsx`](src/components/TradeExecutionPanel.tsx)
  - **Details:** Prominently displays failed transaction state at the bottom of the Buy USDC order form with failure diagnosis, gas cost explanation, direct link to Arkiv faucet top-up, retry button, dismiss option, and 1-click test simulation.

---

### Phase 6: Interactive UPI Simulator & 45-Second Judge Flow
*Designed so anyone can evaluate the full system in under 45 seconds without Indian bank accounts or external faucets.*

- [x] **TASK-601: 1-Click Judge Evaluation Banner**
  - **File:** [`src/app/page.tsx`](src/app/page.tsx#L338-L415)
  - **Details:** 3 numbered interactive step buttons with active state badges:
    1. Step 1: Post INR Order (`createEntity` + 60m TTL)
    2. Step 2: Lock Order (`patchEntity` + 30m Ephemeral TTL)
    3. Step 3: zkTLS Pay & Settle (`predictEntityKey` + `patchEntity` + Base Escrow release)

- [x] **TASK-602: Interactive Indian Smartphone UPI Simulator**
  - **File:** [`src/components/ZkSettlementModal.tsx`](src/components/ZkSettlementModal.tsx#L250-L380)
  - **Details:** Realistic smartphone container with app switcher (Google Pay, PhonePe, Paytm, BHIM), recipient VPA verification, bank account selector, and 6-digit numeric PIN pad.

- [x] **TASK-603: Realistic Banking Network Handshake**
  - **File:** [`src/components/ZkSettlementModal.tsx`](src/components/ZkSettlementModal.tsx#L98-L121)
  - **Details:** 900ms simulated NPCI switch network handshake returning a randomized RFC-compliant 12-digit UTR (`SYNTH-UTR-XXXXXXXXXXXX`).

- [x] **TASK-604: zkTLS Transcript Redaction Visualizer**
  - **File:** [`src/components/ZkSettlementModal.tsx`](src/components/ZkSettlementModal.tsx#L480-L535)
  - **Details:** Visual inspection of the TLS 1.3 JSON response showing confidential fields clearly stamped with `"REDACTED_BY_ZKTLS_ENCLAVE"`.

- [x] **TASK-605: Zero-Gas Resilient Fallback Mode**
  - **File:** [`src/app/page.tsx`](src/app/page.tsx#L258-L288)
  - **Details:** If a judge visits without testnet faucet funds, the app catches insufficient gas errors and activates an interactive fallback state generating deterministic keys and progressing the lifecycle without blocking evaluation.

---

### Phase 7: Automated Keepers, Seeding & Vercel Cron
*Ensuring the orderbook remains continuously populated with active on-chain liquidity.*

- [x] **TASK-701: Tiramisu Entity Seeding Script**
  - **File:** [`scripts/seedTiramisu.ts`](scripts/seedTiramisu.ts)
  - **Command:** `pnpm run seed`
  - **Details:** CLI script that connects to Tiramisu Testnet, creates 3 canonical entities (`OPEN`, `LOCKED`, and `SETTLED`), and prints the wallet address and entity keys.

- [x] **TASK-702: Vercel Automated Market Maker Cron**
  - **File:** [`src/app/api/cron/market-maker/route.ts`](src/app/api/cron/market-maker/route.ts)
  - **Route:** `GET /api/cron/market-maker`
  - **Details:** Queries live on-chain liquidity; if open orders drop below 3, automatically replenishes liquidity on Arkiv DB-Chain using configured keeper credentials.

- [x] **TASK-703: Vercel Cron Job Configuration**
  - **File:** [`vercel.json`](vercel.json)
  - **Details:** Configured cron schedule to trigger keeper replenishment periodically.

- [x] **TASK-704: Environment Variable Schema & Security**
  - **Files:** [`.env`](.env), [`.gitignore`](.gitignore)
  - **Details:** Strictly ignores `.env` in git while providing clean configuration variables for RPCs, chain IDs, and contract addresses.

---

### Phase 8: Testing, Verification & Hackathon Artifacts
*Testing, compilation, build verification, and presentation deliverables.*

- [x] **TASK-801: Solc Contract Compilation Verification**
  - **Command:** `pnpm run compile:contracts`
  - **Result:** Successfully compiled `BaseSepoliaEscrow.sol` to bytecode and ABI with zero errors.

- [x] **TASK-802: Next.js Production Build & Typecheck**
  - **Command:** `pnpm build`
  - **Result:** Successfully compiled static routes (`/`, `/_not-found`) and dynamic route (`/api/cron/market-maker`) with zero TypeScript errors.

- [x] **TASK-803: Complete Testing & Verification Guide**
  - **File:** [`test.md`](test.md)
  - **Details:** Definitive matrix distinguishing what is fully testnet vs. what is simulation, unit tests, integration test commands, and step-by-step verification runbook for judges.

- [x] **TASK-804: Presentation & Pitch Deck**
  - **Files:** [`presentation.md`](presentation.md), [`presentaiton.md`](presentaiton.md)
  - **Details:** 10-slide pitch deck with elevator pitch, problem statement, architecture shootout, 5 core Arkiv features, live demo script, developer friction highlights, and rubric alignment.

- [x] **TASK-805: Master Task Tracker**
  - **File:** [`task.md`](task.md)
  - **Details:** Comprehensive task matrix tracking all completed milestones and future production tasks.

- [x] **TASK-806: Public User & Developer Guide**
  - **File:** [`HOW_TO_USE.md`](HOW_TO_USE.md)
  - **Details:** Comprehensive public user and developer guide detailing maker workflows, taker workflows, UPI simulator usage, zkTLS verification, raw entity inspection, and developer runbooks.

---

## 3. Change Log & Recent Updates

| Date / Commit | Change Description | Files Touched |
| :--- | :--- | :--- |
| **Oct 18, 2026**<br>`0ae15ed` | **Zero-Gas Resilient Fallback:** Implemented fallback in `page.tsx` so judges can test full 3-step order lifecycle even without faucet funds. | `src/app/page.tsx` |
| **Oct 18, 2026**<br>`4d8a903` | **Base Sepolia Escrow Integration:** Added contract client, deploy script, ABI, and BaseScan explorer links. | `contracts/BaseSepoliaEscrow.sol`, `scripts/deployBaseSepolia.ts`, `src/lib/baseEscrowClient.ts` |
| **Oct 18, 2026**<br>`6cefdfe` | **Interactive UPI Simulator & Candles:** Created 4-app smartphone PIN pad, TLS 1.3 session generator, and dynamic candlestick chart. | `src/components/ZkSettlementModal.tsx`, `src/components/PriceChart.tsx` |
| **Oct 18, 2026**<br>`fe13427` | **Dynamic On-Chain Orderbook & Cron Keeper:** Wired real-time query filters, WebSocket streaming, and Vercel cron keeper. | `src/components/LiveOrderbook.tsx`, `src/app/api/cron/market-maker/route.ts` |
| **Oct 18, 2026**<br>`e8d478c` | **Pro Exchange Terminal UI:** Redesigned app into dark/light financial-grade trading terminal with L2 depth and trade panel. | `src/app/page.tsx`, `src/components/OrderBookTerminal.tsx`, `src/components/TradeExecutionPanel.tsx` |
| **Oct 18, 2026**<br>*(Current)* | **Hackathon Documentation Artifacts:** Created `presentation.md`, `task.md`, and `test.md` with complete testnet vs. simulation delineation. | `presentation.md`, `task.md`, `test.md`, `scripts/seedTiramisu.ts` |

---

## 4. Post-Hackathon Production Backlog

- [ ] **TASK-901: Multi-Party Computation (MPC) zkTLS Notaries**
  - Replace client-side simulation with decentralized MPC notary nodes (TLSNotary / Reclaim Protocol) for production web proofs.
- [ ] **TASK-902: Mainnet Smart Contract Formal Verification**
  - Comprehensive smart contract security audit and Certora formal verification for `P2PBaseSepoliaEscrow.sol`.
- [ ] **TASK-903: Multi-Fiat Currency Expansion**
  - Extend indexed attribute `fiatCurrency` to support Thai Baht (PromptPay), Indonesian Rupiah (QRIS), Brazilian Real (Pix), and Nigerian Naira (eNaira).
- [ ] **TASK-904: Native Mobile Progressive Web App (PWA)**
  - Package trading terminal as an offline-capable PWA with biometrics and hardware enclave key storage.
