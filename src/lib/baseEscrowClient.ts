import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";

// Circle Native USDC on Base Sepolia
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Canonical deployed Escrow contract on Base Sepolia
export const BASE_SEPOLIA_ESCROW_ADDRESS =
  (process.env.NEXT_PUBLIC_BASE_SEPOLIA_ESCROW as `0x${string}`) ||
  "0xe43113320abe84a5c155016bc21cd9abceedfb05";

export const baseSepoliaPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

export const BASE_SEPOLIA_ESCROW_ABI = [
  {
    type: "function",
    name: "depositEscrow",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "usdcAmount", type: "uint256" },
      { name: "amountInr", type: "uint256" },
      { name: "arkivEntityKey", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "lockEscrow",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "taker", type: "address" },
      { name: "ttlSeconds", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settleEscrowWithZkProof",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "zkProof", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usedNullifiers",
    inputs: [{ name: "nullifierHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "OrderDeposited",
    inputs: [
      { name: "orderId", type: "bytes32", indexed: true },
      { name: "maker", type: "address", indexed: true },
      { name: "usdcAmount", type: "uint256", indexed: false },
      { name: "arkivEntityKey", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "OrderSettled",
    inputs: [
      { name: "orderId", type: "bytes32", indexed: true },
      { name: "taker", type: "address", indexed: true },
      { name: "usdcAmount", type: "uint256", indexed: false },
      { name: "nullifier", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const BASE_SEPOLIA_USDC_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export function getBaseScanTxUrl(txHash: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`;
}

export function getBaseScanAddressUrl(address: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/address/${address}`;
}
