# Arkiv Developer Friction Report (`@arkiv-network/sdk` 0.8.x on Tiramisu)

**Environment:**
- SDK Version: `@arkiv-network/sdk` `0.8.1`
- Chain: Tiramisu Testnet (`chainId: 7738577`)
- HTTP RPC: `https://rpc.tiramisu.db-chain.testnet.arkiv.network`
- WSS RPC: `wss://rpc.tiramisu.db-chain.testnet.arkiv.network`
- Runtime: Node.js v20.x+ / Next.js 14 Browser Bundle (V8)

---

## Issue 1: Full Groth16 Proof + Public Signals Hitting Payload Constraints (`MAX_PAYLOAD_BYTES`)
- **Severity:** Medium
- **Context:** When storing a complete unminified SnarkJS Groth16 proof (`pi_a`, `pi_b`, `pi_c`), public signals array, and TLS notary certificate header metadata inside `jsonToPayload()`, payload serialization size spikes rapidly above 4KB.
- **Reproduction Steps:**
  1. Generate a standard Groth16 JSON proof object alongside a simulated TLS certificate chain header.
  2. Pass the combined object into `jsonToPayload(...)` inside `walletClient.createEntity()`.
  3. Observe payload bloat and increased RPC serialization latency when querying multiple entities in a single orderbook view.
- **Workaround Implemented:** We separated the cryptographic verification step from storage—storing compact 32-byte Poseidon commitments (`nullifierHash`, `tlsTranscriptCommitment`, `groth16ProofDigest`) in the Arkiv Entity payload while keeping raw TLS transcripts off-chain.
- **Suggestion for Arkiv Team:** Provide a built-in helper or compression flag in `jsonToPayload(data, { compress: true })` or document recommended byte budgets per entity for high-frequency list queries.

---

## Issue 2: Attribute Naming Constraints (`InvalidAttributeNameError`) & Lack of Compile-Time TypeScript Guard
- **Severity:** Low / DX
- **Context:** When defining indexed attributes in `createEntity({ attributes: { ... } })`, using hyphenated or reserved characters (e.g., `"order-id"` or `"zk_verified.status"`) throws a runtime `InvalidAttributeNameError` rather than a compile-time TypeScript error.
- **Reproduction Steps:**
  ```ts
  await walletClient.createEntity({
    attributes: {
      "fiat-currency": str("INR"), // Throws runtime InvalidAttributeNameError
    },
    payload: jsonToPayload({ ok: true }),
    expiresIn: ExpirationTime.fromMinutes(10),
  });
  ```
- **Workaround Implemented:** Standardized all attribute keys to strict alphanumeric camelCase (`appId`, `entityType`, `status`, `fiatCurrency`, `amountInr`, `rate`, `zkVerified`).
- **Suggestion for Arkiv Team:** Add a template literal type restriction on attribute keys in TypeScript (e.g. `type ValidAttributeName<S>`) so invalid characters are caught in the IDE before transaction submission.

---

## Issue 3: WebSocket Subscription Reconnection (`watchEntityEvents`) in Browser Tabs
- **Severity:** Medium
- **Context:** Connecting to `wss://rpc.tiramisu.db-chain.testnet.arkiv.network` via `watchEntityEvents` works smoothly on initial mount, but if a user's browser tab sleeps or network switches briefly, silent socket drops require manual polling fallback to ensure orderbook state (`OPEN` -> `LOCKED` -> `SETTLED`) stays synchronized.
- **Reproduction Steps:**
  1. Subscribe to entity creations/patches via `wsPublicClient.watchEntityEvents(...)`.
  2. Throttle network in Chrome DevTools to Offline for 15 seconds, then restore Online.
  3. Trigger `patchEntity` from a second browser window.
- **Workaround Implemented:** Built a hybrid sync hook in `LiveOrderbook.tsx` that pairs instant state transitions with a lightweight `query(filter)` reconciliation poll every 8 seconds.
- **Suggestion for Arkiv Team:** Expose automatic reconnection and heartbeat parameters in `watchEntityEvents` (e.g., `{ reconnect: true, heartbeatIntervalMs: 5000 }`).

---

## Issue 4: Atomic Uniqueness Check on Nullifiers (`predictEntityKey` vs Conditional Create)
- **Severity:** Architectural / Feature Request
- **Context:** In ZK payment applications, preventing double-spends requires checking that a `nullifierHash` entity does not already exist before patching an order to `SETTLED`. Currently, `predictEntityKey` allows deterministic key generation, but batch atomic checks have a small TOCTOU (time-of-check to time-of-use) window between read and write.
- **Workaround Implemented:** We use `predictEntityKey` with deterministic salt and nonce binding the taker address and nullifier hash. If the predicted entity key already exists, the settlement transaction reverts.
- **Suggestion for Arkiv Team:** Supporting a native `unique: true` constraint on an indexed attribute (or deterministic key collision revert when using `predictEntityKey`) would make Arkiv an unbeatable native settlement layer for ZK nullifier registries.
