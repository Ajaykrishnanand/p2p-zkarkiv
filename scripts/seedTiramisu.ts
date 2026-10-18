/**
 * Tiramisu Testnet Seeding Script
 *
 * Populates 3 canonical sample entities on the live Arkiv DB-Chain:
 * 1. OPEN Order (Fresh liquidity with 60-min TTL)
 * 2. LOCKED Order (Buyer payment in-progress with 30-min TTL)
 * 3. SETTLED Order (Cryptographically settled with zkTLS Groth16 proof & Poseidon nullifier)
 */

import "dotenv/config";
import { generatePrivateKey } from "viem/accounts";
import { getBurnerWalletClient } from "../src/lib/arkivClient";
import {
  createP2POrder,
  lockP2POrder,
  settleOrderWithZkTlsProof,
  P2POrderPayload,
} from "../src/lib/arkivOrderbook";
import { simulateBankTlsSession, generateZkTlsProof } from "../src/lib/zkTlsProver";
import { generateSyntheticUpi } from "../src/lib/syntheticGuard";

async function main() {
  console.log("=================================================");
  console.log("   zkUPI-Arkiv — Tiramisu Testnet Entity Seeder   ");
  console.log("=================================================\n");

  const privateKey = (process.env.PRIVATE_KEY as `0x${string}`) || generatePrivateKey();
  const { account, client } = getBurnerWalletClient(privateKey);

  console.log(`📡 Wallet Address : ${account.address}`);
  console.log(`🔗 Network        : Tiramisu Testnet (Chain ID 7738577)`);
  console.log(`🔍 Explorer       : https://tiramisu.explorer.arkiv.network/address/${account.address}\n`);

  try {
    // 1. Seed OPEN Order
    console.log("1️⃣  Creating OPEN P2P Order Entity...");
    const order1Id = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const order1Tx = await createP2POrder(client, {
      orderId: order1Id,
      makerAddress: account.address,
      amountInr: 5000,
      usdcAmount: "57.47",
      rateInrPerUsdc: 87,
      syntheticUpiAlias: generateSyntheticUpi("arjun", "okhdfc"),
      ttlMinutes: 60,
    });
    console.log(`   ✅ Entity Key: ${order1Tx.key}`);
    console.log(`   📦 Status: OPEN | Amount: ₹5,000 INR | TTL: 60m\n`);

    // 2. Seed LOCKED Order
    console.log("2️⃣  Creating & Locking Order Entity...");
    const order2Id = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const order2Tx = await createP2POrder(client, {
      orderId: order2Id,
      makerAddress: account.address,
      amountInr: 15000,
      usdcAmount: "170.45",
      rateInrPerUsdc: 88,
      syntheticUpiAlias: generateSyntheticUpi("priya", "okaxis"),
      ttlMinutes: 60,
    });

    const mockTaker = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const initialPayload2: P2POrderPayload = {
      orderId: order2Id,
      makerAddress: account.address,
      usdcAmount: "170.45",
      syntheticUpiAlias: generateSyntheticUpi("priya", "okaxis"),
      createdAt: new Date().toISOString(),
      takerAddress: null,
      zkProofSummary: null,
      nullifierEntityKey: null,
    };

    await lockP2POrder(client, order2Tx.key, initialPayload2, mockTaker);
    console.log(`   ✅ Entity Key: ${order2Tx.key}`);
    console.log(`   🔒 Status: LOCKED | Amount: ₹15,000 INR | Locked By: ${mockTaker}\n`);

    // 3. Seed SETTLED Order with zkTLS Proof
    console.log("3️⃣  Creating & Settling Order Entity with zkTLS Proof...");
    const order3Id = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const syntheticPayee = generateSyntheticUpi("rahul", "okicici");
    const order3Tx = await createP2POrder(client, {
      orderId: order3Id,
      makerAddress: account.address,
      amountInr: 2500,
      usdcAmount: "28.90",
      rateInrPerUsdc: 86.5,
      syntheticUpiAlias: syntheticPayee,
      ttlMinutes: 60,
    });

    const tlsSession = simulateBankTlsSession({
      amountInr: 2500,
      recipientAlias: syntheticPayee,
    });
    const zkBundle = await generateZkTlsProof(tlsSession);

    const initialPayload3: P2POrderPayload = {
      orderId: order3Id,
      makerAddress: account.address,
      usdcAmount: "28.90",
      syntheticUpiAlias: syntheticPayee,
      createdAt: new Date().toISOString(),
      takerAddress: mockTaker,
      zkProofSummary: null,
      nullifierEntityKey: null,
    };

    const settleResult = await settleOrderWithZkTlsProof(
      client,
      account.address,
      order3Tx.key,
      initialPayload3,
      zkBundle
    );

    console.log(`   ✅ Order Entity Key     : ${order3Tx.key}`);
    console.log(`   🛡️  Nullifier Entity Key : ${settleResult.predictedNullifierKey}`);
    console.log(`   ⚡ Status               : SETTLED (zkVerified: true)\n`);

    console.log("🎉 Seeding Completed Successfully on Tiramisu Testnet!");
  } catch (err: any) {
    console.log("\n⚠️  Notice: The generated burner address has no testnet gas on Tiramisu.");
    console.log(`👉 To fund this address: Request testnet tokens from the Tiramisu Faucet for:\n   ${account.address}`);
    console.log("👉 Or pass a pre-funded private key: PRIVATE_KEY=0x... pnpm run seed\n");
  }
}

main();
