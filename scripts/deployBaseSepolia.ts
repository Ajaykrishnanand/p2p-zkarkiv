/**
 * Base Sepolia Escrow Deployment Script
 *
 * Deploys P2PBaseSepoliaEscrow.sol to Base Sepolia (Chain ID: 84532)
 * using the private key configured in .env.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { createWalletClient, createPublicClient, http, formatEther, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const CIRCLE_USDC_BASE_SEPOLIA =
  (process.env.BASE_SEPOLIA_USDC as `0x${string}`) || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  console.log("========================================================");
  console.log("  zkUPI-Arkiv — Base Sepolia Escrow Deployer (84532)   ");
  console.log("========================================================\n");

  const privateKey = (process.env.BASE_SEPOLIA_PRIVATE_KEY || process.env.PRIVATE_KEY) as `0x${string}`;

  if (!privateKey) {
    console.error("❌ Error: No PRIVATE_KEY or BASE_SEPOLIA_PRIVATE_KEY found in .env.");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  console.log(`📡 Deployer Address : ${account.address}`);
  console.log(`🔗 Target Network    : Base Sepolia (Chain ID 84532)`);
  console.log(`🪙 Collateral USDC   : ${CIRCLE_USDC_BASE_SEPOLIA}`);
  console.log(`🔍 BaseScan Explorer : https://sepolia.basescan.org/address/${account.address}\n`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });

  // Check deployer ETH balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer Balance  : ${formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.log("\n⚠️  Deployer has 0 ETH on Base Sepolia.");
    console.log("👉 Please request free testnet ETH from any of these faucets:\n");
    console.log(`   1. Coinbase Faucet : https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet`);
    console.log(`   2. Superchain Faucet: https://console.optimism.io/faucet`);
    console.log(`   3. QuickNode Faucet : https://faucet.quicknode.com/base/sepolia`);
    console.log(`   4. LearnWeb3 Faucet : https://learnweb3.io/faucets/base_sepolia\n`);
    console.log(`👉 Destination Address: ${account.address}`);
    console.log("👉 Once funded, simply re-run: pnpm run deploy:base\n");
    return;
  }

  // Load compiled artifacts
  const binPath = path.resolve(__dirname, "../contracts/build/P2PBaseSepoliaEscrow.bin");
  const abiPath = path.resolve(__dirname, "../contracts/build/P2PBaseSepoliaEscrow.abi");

  if (!fs.existsSync(binPath) || !fs.existsSync(abiPath)) {
    console.error("❌ Error: Build artifacts not found. Run solc compilation first.");
    process.exit(1);
  }

  const bytecode = ("0x" + fs.readFileSync(binPath, "utf-8").trim()) as `0x${string}`;
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf-8"));

  console.log("\n🚀 Broadcasting deployment transaction to Base Sepolia...");

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [CIRCLE_USDC_BASE_SEPOLIA],
  });

  console.log(`   Tx Hash: ${hash}`);
  console.log(`   View on BaseScan: https://sepolia.basescan.org/tx/${hash}`);
  console.log("   Waiting for block confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  if (!contractAddress) {
    console.error("❌ Deployment failed: no contract address in receipt.");
    process.exit(1);
  }

  console.log(`\n🎉 P2PBaseSepoliaEscrow Deployed Successfully!`);
  console.log(`📍 Contract Address : ${contractAddress}`);
  console.log(`🔗 BaseScan Link    : https://sepolia.basescan.org/address/${contractAddress}\n`);

  // Update .env with the deployed contract address
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("NEXT_PUBLIC_BASE_SEPOLIA_ESCROW=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_BASE_SEPOLIA_ESCROW=.*/,
        `NEXT_PUBLIC_BASE_SEPOLIA_ESCROW=${contractAddress}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_BASE_SEPOLIA_ESCROW=${contractAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`💾 Saved contract address to .env`);
  }
}

main().catch((err) => {
  console.error("Deployment Error:", err);
  process.exit(1);
});
