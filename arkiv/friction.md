# Arkiv Developer Friction Report (`@arkiv-network/sdk` v0.8.1 on Tiramisu)

**Repository Link:** [https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/arkiv/friction.md](https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/arkiv/friction.md)  
**Environment & Versions Used:**
- **SDK Version:** `@arkiv-network/sdk` `0.8.1`
- **Network / Chain:** Arkiv Tiramisu Testnet (`chainId: 7738577`)
- **RPC Endpoints:** `https://rpc.tiramisu.db-chain.testnet.arkiv.network` / `wss://rpc.tiramisu.db-chain.testnet.arkiv.network`
- **Runtime Environment:** Next.js 14.2 (V8 / Chromium) & Node.js v20.x+
- **Smart Contract Escrow:** Base Sepolia Testnet (`chainId: 84532`)

---

## Issue 1: Mandatory `contentType` Requirement When Using `jsonToPayload()` (`InvalidContentTypeError`)

- **Versions Used:** `@arkiv-network/sdk` `0.8.1`
- **What Was Expected:**  
  When passing an entity payload formatted via the SDK's built-in `jsonToPayload(data)` helper to `walletClient.createEntity()` or `walletClient.patchEntity()`, we expected the SDK to automatically infer and set `contentType: "application/json"`.
- **What Actually Happened:**  
  The transaction was rejected at runtime with:  
  `InvalidContentTypeError: Invalid content type "undefined"`  
  The developer must explicitly remember to specify `{ contentType: "application/json" }` alongside `payload: jsonToPayload(...)` on every single mutation.
- **Steps to Reproduce:**
  1. Initialize a connected `ArkivWalletClient` using `@arkiv-network/sdk`.
  2. Call `createEntity`:
     ```ts
     await walletClient.createEntity({
       attributes: { appId: str("zkupi-v1"), status: str("OPEN") },
       payload: jsonToPayload({ orderId: "ORD-1234", amount: 100 }),
       expiresIn: ExpirationTime.fromMinutes(30),
       // omitted contentType
     });
     ```
  3. Observe runtime `InvalidContentTypeError: Invalid content type "undefined"`.
- **Workaround Implemented:**  
  Created a global constant `export const CONTENT_TYPE_JSON = "application/json"` in [`src/lib/arkivOrderbook.ts`](https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/src/lib/arkivOrderbook.ts#L17) and explicitly pass it to every `createEntity` and `patchEntity` call.
- **Suggestion for Arkiv Team:**  
  Automatically default `contentType` to `"application/json"` whenever `jsonToPayload(...)` is detected as the payload.

---

## Issue 2: Hyphenated Attribute Naming Constraints Throwing Runtime Errors Instead of TypeScript Compile Errors

- **Versions Used:** `@arkiv-network/sdk` `0.8.1`
- **What Was Expected:**  
  When declaring indexed attributes in `createEntity({ attributes: { ... } })`, we expected standard kebab-case or period-separated identifiers (e.g., `"fiat-currency"` or `"order-id"`) to either be valid or be caught immediately at compile-time by TypeScript.
- **What Actually Happened:**  
  TypeScript allowed the keys during development, but submitting the transaction threw a runtime RPC error:  
  `InvalidAttributeNameError: Attribute name "fiat-currency" contains invalid characters.`
- **Steps to Reproduce:**
  1. Call `walletClient.createEntity` with a hyphenated attribute name:
     ```ts
     await walletClient.createEntity({
       attributes: {
         "fiat-currency": str("INR"), // Compiles fine in TypeScript, fails at runtime
       },
       contentType: "application/json",
       payload: jsonToPayload({ ok: true }),
       expiresIn: ExpirationTime.fromMinutes(10),
     });
     ```
  2. Observe runtime failure with `InvalidAttributeNameError`.
- **Workaround Implemented:**  
  Enforced a strict project-wide convention using camelCase alphanumeric characters only (`appId`, `entityType`, `status`, `fiatCurrency`, `amountInr`, `rate`, `zkVerified`) across all schemas.
- **Suggestion for Arkiv Team:**  
  Introduce template literal typing on attribute keys in `@arkiv-network/sdk` (e.g. `type ValidAttributeKey<K extends string> = K extends ...`) so invalid characters are flagged directly in the developer's IDE before runtime submission.

---

## Issue 3: Full Groth16 Proof & TLS Notary Payload Bloat vs. Sub-Second Orderbook Latency

- **Versions Used:** `@arkiv-network/sdk` `0.8.1`
- **What Was Expected:**  
  We intended to store the complete raw zero-knowledge proof bundle (full SnarkJS Groth16 `pi_a`, `pi_b`, `pi_c`, public signals array, and TLS notary certificate chain headers) directly within the Arkiv order payload for end-to-end decentralized verifiability.
- **What Actually Happened:**  
  Storing multi-kilobyte uncompressed ZK transcripts inside `jsonToPayload()` significantly inflated payload size (>4KB per entity). When querying 20+ active orders in the spot orderbook, deserialization latency over the public testnet RPC spiked, causing orderbook loading delay.
- **Steps to Reproduce:**
  1. Generate a complete Groth16 JSON proof object along with simulated TLS 1.3 certificate chain headers (~4.5KB).
  2. Pass the combined payload into `createEntity` or `patchEntity`.
  3. Query the orderbook using `publicClient.queryEntities({ filter })` and measure network payload transfer and parse times.
- **Workaround Implemented:**  
  We separated the on-chain settlement state from raw proof storage. We verify the zkTLS proof and Groth16 proof client-side, and store compact 32-byte cryptographic commitments (`nullifierHash`, `tlsTranscriptCommitment`, `groth16ProofDigest`) in the Arkiv Entity payload. The full heavy TLS session transcript stays ephemeral in browser memory.
- **Suggestion for Arkiv Team:**  
  Provide a built-in payload compression option in the SDK (e.g. `jsonToPayload(data, { gzip: true })`) and document recommended byte budget guidelines for high-frequency queried entities.

---

## Issue 4: WebSocket Silent Reconnection Drops in Browser Environments

- **Versions Used:** `@arkiv-network/sdk` `0.8.1` / Viem WebSocket Provider
- **What Was Expected:**  
  When subscribing to real-time events via `wsPublicClient.watchBlockNumber` or `watchEntityEvents` in a web browser, we expected the client to automatically reconnect and resume event delivery after brief network interruptions (e.g. laptop lid close, tab background sleep, or Wi-Fi reconnection).
- **What Actually Happened:**  
  If the browser tab slept or the network dropped briefly, the underlying WebSocket connection disconnected silently without automatic re-subscription, leaving the orderbook in a stale state until a manual page refresh.
- **Steps to Reproduce:**
  1. Open the application and subscribe via `watchBlockNumber`.
  2. In Chrome DevTools > Network tab, simulate "Offline" for 15 seconds, then toggle back to "Online".
  3. Notice that incoming block and entity events cease arriving over the socket.
- **Workaround Implemented:**  
  Built a resilient hybrid synchronization architecture in [`src/lib/useArkivWebSocket.ts`](https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/src/lib/useArkivWebSocket.ts) and [`src/app/page.tsx`](https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/src/app/page.tsx):
  - WebSocket monitors real-time block streaming.
  - A silent, calm background reconciliation poll (every 25 seconds) runs alongside to ensure state consistency.
  - Added an in-flight guard (`isFetchingRef`) and data fingerprint diff check (`prevOrdersHashRef`) so background polling never flickers or re-renders the UI when order data is unchanged.
- **Suggestion for Arkiv Team:**  
  Add native automatic reconnection options with exponential backoff and heartbeat pings to `wsPublicClient` in `@arkiv-network/sdk` (e.g., `{ autoReconnect: true, heartbeatMs: 10000 }`).

---

## Issue 5: Need for Atomic Uniqueness Enforcement on Deterministic Nullifier Keys

- **Versions Used:** `@arkiv-network/sdk` `0.8.1`
- **What Was Expected:**  
  To prevent double-spend replay attacks in peer-to-peer fiat settlements, we wanted to ensure that once a bank payment receipt (`nullifierHash`) is registered on Arkiv, no subsequent transaction can register or settle with that same nullifier.
- **What Actually Happened:**  
  `predictEntityKey` allows deterministic derivation of entity keys, which is great. However, if two concurrent transactions attempt to create an entity with the same predicted key, handling the collision cleanly requires an atomic check-and-create primitive to prevent a Time-of-Check to Time-of-Use (TOCTOU) race condition.
- **Steps to Reproduce:**
  1. Derive a deterministic key: `const key = predictEntityKey(nullifierHash, NO_SALT)`.
  2. Attempt to create the entity in two concurrent async calls.
  3. Handle the resulting collision exception manually.
- **Workaround Implemented:**  
  We bind the nullifier hash and maker/taker addresses deterministically. In [`src/lib/arkivOrderbook.ts`](https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/src/lib/arkivOrderbook.ts#L450-L485), we verify the nullifier registry entity using `predictEntityKey` before executing `patchEntity` on the target order to `status: "SETTLED"`. If an existing entity key is detected, the settlement transaction reverts immediately.
- **Suggestion for Arkiv Team:**  
  Introduce a native `unique: true` constraint on indexed attributes or an atomic `createIfNotExist` helper in `@arkiv-network/sdk`. This would make Arkiv the ultimate native layer for ZK nullifier registries and financial settlement ledgers.
