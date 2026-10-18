# zkUPI-Arkiv — Public User & Developer Guide
### How to Use the Censorship-Resistant, Zero-Knowledge P2P UPI Orderbook

> **Live Application:** [p2p-zkarkiv.vercel.app](http://localhost:3005)  
> **Target Networks:** Arkiv Tiramisu Testnet (`7738577`) & Base Sepolia Testnet (`84532`)  
> **Security Guarantee:** 100% Synthetic Zero-PII • No Real Bank Statement Leaks • Cryptographic zkTLS Settlement

---

## 1. Welcome to zkUPI-Arkiv

In India, over **18 billion UPI transactions** happen every month. However, peer-to-peer crypto traders face catastrophic threats on centralized platforms like Binance P2P:
1. **Malicious Bank Freezes:** Scammers scrape open VPAs and trigger cybercrime police liens that freeze innocent merchants' bank accounts.
2. **Bank Statement Leaks:** Centralized dispute desks force users to upload raw bank PDFs and screenshots, exposing lifetime balances, home addresses, and account numbers.
3. **Platform Censorship:** Centralized platforms can freeze funds or censor orders at will.

**zkUPI-Arkiv solves this using Arkiv DB-Chain:**
- **Zero Real PII on Arkiv:** All orders enforce synthetic aliases (`*.synth@upi`). No real phone numbers or bank accounts are ever stored on-chain.
- **Zero-Screenshot zkTLS Proofs:** Instead of uploading a bank statement, your browser generates a client-side cryptographic proof from the bank's TLS 1.3 session. Your remaining bank balance and account number are **strictly redacted**.
- **Deterministic Replay Protection:** Arkiv's `predictEntityKey` guarantees that no one can reuse the same UPI payment receipt twice.

---

## 2. ⚡ The 45-Second Judge & Quick Evaluation Flow

If you are a hackathon judge or first-time visitor, you can test the **entire end-to-end lifecycle in under 45 seconds** without needing an Indian bank account or testnet faucet tokens:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        1-CLICK JUDGE EVALUATION CONTROL BAR                            │
│  [1. Post Order on Arkiv]  ──▶  [2. Lock Order (Buyer)]  ──▶  [3. zkTLS Pay & Settle] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Step 1: Click "1. Post Order on Arkiv"**
   - Posts a pre-configured quote of **₹5,000 INR at ₹87.50 / USDC** with synthetic alias `judge.synth@okhdfc`.
   - Uses Arkiv's `createEntity` with 7 indexed attributes and an automatic **60-minute TTL** (`ExpirationTime`).
   - The status updates with the live 32-byte hexadecimal Entity Key (`0x...`).
2. **Step 2: Click "2. Lock Order (Buyer)"**
   - Simulates a buyer initiating payment.
   - Executes `patchEntity` on Arkiv, mutating the status to `LOCKED` and setting a **30-minute ephemeral lock** window.
3. **Step 3: Click "3. zkTLS Pay & Settle"**
   - Opens the interactive **P2P UPI Payment & zkTLS Settlement Modal**:
     - **Phone PIN Pad:** Select Google Pay, PhonePe, Paytm, or BHIM $\rightarrow$ enter any 6-digit PIN $\rightarrow$ click **"Pay ₹5,000 INR"**.
     - **TLS 1.3 Transcript:** Inspect the simulated bank response. Notice that `payerAccount`, `remainingBalance`, and `personalKycName` are permanently stamped `"REDACTED_BY_ZKTLS_ENCLAVE"`.
     - **Generate Proof:** Click **"Generate Groth16 zkTLS Proof"** to compute the Poseidon nullifier hash.
     - **Settle on Arkiv:** Click **"Settle on Arkiv DB-Chain & Release USDC"**.
   - Arkiv uses `predictEntityKey` to register the `utr_nullifier` and patches the order to `SETTLED` (`zkVerified: true`).
   - The trade completes, releasing the escrowed USDC!

---

## 3. 💼 How to Trade as a Maker (Selling USDC for INR)

As a liquidity provider or seller, you deposit USDC and list an order on Arkiv DB-Chain:

1. **Open the Trade Panel:** Look at the **"Place Order"** panel on the right side of the trading terminal.
2. **Select the "Sell USDC" Tab:** Ensure you are on the Sell tab.
3. **Enter the INR Order Amount:**
   - Type your desired INR amount (e.g. `5000`), or click one of the quick buttons: `₹1k`, `₹5k`, `₹10k`, `₹50k`.
   - The panel automatically calculates the USDC amount based on the current exchange rate.
4. **Set Your Exchange Rate:**
   - Adjust the exchange rate in INR per USDC (e.g. `87.50`).
5. **Set Your Synthetic UPI Alias:**
   - Choose a synthetic alias (e.g. `merchant01.synth@okhdfc` or `priya.synth@okaxis`).
   - ⚠️ **Zero-PII Gate:** You *must* use a synthetic alias containing `.synth@` or `.demo@`. If you enter a real 10-digit Indian phone number or real personal VPA, the protocol guard will reject it immediately.
6. **Set the Order Expiration (TTL):**
   - Use the slider to set order validity between **15 minutes and 120 minutes** (default: 60 minutes).
   - *Why?* Arkiv's native `ExpirationTime` automatically removes stale FX quotes from the orderbook so you never get filled at outdated exchange rates.
7. **Click "Post Order on Arkiv DB-Chain":**
   - The order entity is broadcast to the Tiramisu Testnet validator network and instantly appears in the live orderbook.

---

## 4. 🛒 How to Trade as a Taker (Buying USDC with INR via UPI)

As a buyer, you pay INR to the seller via UPI and receive collateralized USDC:

1. **Browse the Live Orderbook:**
   - In the **"P2P Orders & Liquidity Stream"** table, review available liquidity quotes.
   - Filter by **"All"**, **"Open"**, **"Locked"**, or **"Settled"**.
2. **Select an Order:**
   - Find an `OPEN` order and click **"Lock & Pay"** or **"Take Order"**.
3. **Lock the Order on Arkiv:**
   - In the settlement modal, click **"1. Lock Order on Arkiv"**.
   - This executes `patchEntity` on Arkiv, reserving the order for you and activating a **30-minute lock timer**.
4. **Simulate UPI Payment:**
   - Select your favorite Indian UPI app:
     * 🔵 **Google Pay**
     * 🟣 **PhonePe**
     * 💠 **Paytm**
     * 🟢 **BHIM UPI**
   - Enter your 6-digit UPI PIN on the smartphone keypad.
   - Click **"Pay ₹[amount] INR"**.
   - The simulated banking switch processes the payment and generates an authentic 12-digit UTR (`SYNTH-UTR-XXXXXXXXXXXX`).
5. **Inspect the zkTLS Enclave Transcript:**
   - Click **"Inspect TLS Transcript & Generate Proof"**.
   - Review the banking response JSON. Notice that your account balance and personal details are completely hidden.
6. **Generate Groth16 Proof & Settle:**
   - Click **"Generate Groth16 zkTLS Proof"**.
   - The prover derives the Poseidon nullifier hash $H(\text{secretKey}, \text{syntheticUtr})$.
   - Click **"Settle on Arkiv DB-Chain & Release USDC"**.
   - Arkiv registers the nullifier entity and patches the order status to `SETTLED`. The escrow contract releases the USDC to your wallet address!

---

## 5. 🔍 How to Inspect Raw Arkiv On-Chain Data

Transparency is built directly into every order card:

1. On any order row in the Live Orderbook, click the **"Raw Entity"** button.
2. A slide-out JSON drawer will open showing:
   - **Entity Key:** The exact 32-byte hexadecimal hash (e.g. `0x8b4f1092830...`).
   - **Indexed Attributes:** Real-time values for `appId`, `entityType`, `status`, `amountInr`, `rate`, and `zkVerified`.
   - **Decoded Payload:** The full JSON payload stored on Arkiv (`orderId`, `makerAddress`, `syntheticUpiAlias`, `zkProofSummary`).
   - **Remaining TTL:** A live countdown timer displaying when Arkiv validator nodes will automatically garbage-collect the order.
   - **Explorer Link:** Click **"View on Tiramisu Explorer"** to verify the entity on [tiramisu.explorer.arkiv.network](https://tiramisu.explorer.arkiv.network).

---

## 6. 👛 Wallet Options: Burner Signer vs. MetaMask

zkUPI-Arkiv supports two wallet modes:

### Option A: Automatic Burner Signer (Zero Setup, Recommended)
* Upon opening the application, a secure local session burner wallet is automatically generated and stored in browser memory.
* Your burner address is displayed in the top navbar (e.g. `0xeD33...f829`).
* You do not need to install browser extensions or configure custom RPCs.
* Includes **Zero-Gas Resilient Fallback Mode**: Even if your burner address has zero testnet tokens, you can test the entire trading flow without being blocked by gas errors.

### Option B: MetaMask / Browser Wallet
* Click the **"Burner Signer"** button in the top navbar to connect your MetaMask or browser wallet.
* Network details for MetaMask:
  - **Network Name:** Arkiv Tiramisu Testnet
  - **RPC URL:** `https://rpc.tiramisu.db-chain.testnet.arkiv.network`
  - **Chain ID:** `7738577`
  - **Currency Symbol:** `GLM`
  - **Block Explorer:** `https://tiramisu.explorer.arkiv.network`

---

## 7. 🛠️ Local Developer & Reproducible Runbook

If you want to run the codebase locally or inspect the CLI scripts:

### Prerequisites:
- Node.js v18.x or v20.x
- `pnpm` (or `npm`)

### 1. Clone & Install
```bash
git clone https://github.com/Ajaykrishnanand/p2p-zkarkiv.git
cd p2p-zkarkiv
pnpm install
```

### 2. Configure Environment Variables
Copy or create a `.env` file in the root directory:
```bash
PRIVATE_KEY=0xb40475b66003a6f336ef8277cbd9456bcf6952d8d27cad4d197c26f1ef48038d
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_SEPOLIA_USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID=84532
NEXT_PUBLIC_BASE_SEPOLIA_EXPLORER=https://sepolia.basescan.org
NEXT_PUBLIC_BASE_SEPOLIA_ESCROW=0xe43113320abe84a5c155016bc21cd9abceedfb05
```

### 3. Start the Development Server
```bash
pnpm dev
```
Open **[http://localhost:3005](http://localhost:3005)** in your browser.

### 4. Run the Contract Compiler
To re-compile the cross-chain escrow smart contract:
```bash
pnpm run compile:contracts
```
This generates [`contracts/build/P2PBaseSepoliaEscrow.bin`](contracts/build) and [`contracts/build/P2PBaseSepoliaEscrow.abi`](contracts/build).

### 5. Seed Entities on Tiramisu Testnet
To seed live `OPEN`, `LOCKED`, and `SETTLED` entities on the Arkiv DB-Chain:
```bash
pnpm run seed
```

### 6. Deploy Escrow to Base Sepolia
To deploy the escrow contract using your private key:
```bash
pnpm run deploy:base
```

---

## 8. ❓ Frequently Asked Questions (FAQ)

#### Q1: Why does the order have an expiration timer?
> **Answer:** In traditional finance, FX rates fluctuate constantly. On Arkiv, `ExpirationTime` ensures that open quotes self-prune after 60 minutes so makers aren't trapped with stale rates, and locked orders expire after 30 minutes if a buyer fails to complete payment.

#### Q2: What stops a buyer from reusing the same UPI payment receipt?
> **Answer:** Every UPI payment generates a unique 12-digit UTR. During settlement, the client computes a cryptographic Poseidon nullifier hash $H(\text{secret}, \text{syntheticUtr})$. Arkiv's `predictEntityKey` deterministically derives the nullifier entity key. If that nullifier already exists on Arkiv or on the Base Sepolia escrow contract (`usedNullifiers[nullifierHash]`), the transaction reverts immediately.

#### Q3: Does the seller see the buyer's real bank account?
> **Answer:** In real-world Indian banking rails, the seller's banking app notifies them of an incoming credit from the buyer. However, **neither the public blockchain, nor scraping bots, nor centralized exchange admins ever see the buyer's bank statement, remaining balance, account number, or real VPA**.

#### Q4: What happens if a buyer locks an order but doesn't pay?
> **Answer:** The lock window is ephemeral (30 minutes). Once the 30-minute timer expires, the order automatically unlocks or the seller can reclaim their escrowed USDC on Base Sepolia by calling `refundExpiredOrder()`.

---

## 9. 🔗 Official Network & Explorer Links

| Resource | URL |
| :--- | :--- |
| **Arkiv Tiramisu Explorer** | [https://tiramisu.explorer.arkiv.network](https://tiramisu.explorer.arkiv.network) |
| **Arkiv Tiramisu RPC** | `https://rpc.tiramisu.db-chain.testnet.arkiv.network` |
| **Arkiv WebSocket RPC** | `wss://rpc.tiramisu.db-chain.testnet.arkiv.network` |
| **Arkiv Test Token Faucet** | [https://hub.arkiv.network/faucet](https://hub.arkiv.network/faucet) |
| **BaseScan Explorer** | [https://sepolia.basescan.org](https://sepolia.basescan.org) |
| **Base Sepolia Faucet** | [https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) |
| **Circle USDC Base Sepolia** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| **Project GitHub Repository** | [https://github.com/Ajaykrishnanand/p2p-zkarkiv](https://github.com/Ajaykrishnanand/p2p-zkarkiv) |
