import {
  createPublicClient,
  createWalletClient,
} from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http, webSocket, custom } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

// Network Constants for Tiramisu Testnet
export const TIRAMISU_CHAIN_ID = 7738577;
export const ARKIV_HTTP_RPC = "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
export const ARKIV_WS_RPC = "wss://rpc.tiramisu.db-chain.testnet.arkiv.network";
export const ARKIV_EXPLORER_URL = "https://tiramisu.explorer.arkiv.network";

/**
 * Arkiv Public Client configured with HTTP transport for querying entities.
 */
export const publicClient = createPublicClient({
  chain: tiramisu,
  transport: http(ARKIV_HTTP_RPC),
});

/**
 * Arkiv WebSocket Public Client for streaming real-time entity updates.
 */
export const wsPublicClient = typeof window !== "undefined"
  ? createPublicClient({
      chain: tiramisu,
      transport: webSocket(ARKIV_WS_RPC),
    })
  : publicClient;

/**
 * Connects directly to MetaMask or browser EIP-1193 wallet to sign live on-chain transactions.
 */
export async function getBrowserWalletClient() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Web3 wallet (MetaMask) detected in browser.");
  }

  const ethereum = (window as any).ethereum;

  // Request accounts
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts authorized in MetaMask.");
  }

  const account = accounts[0] as `0x${string}`;

  // Ensure network is Tiramisu Testnet
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${TIRAMISU_CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError: any) {
    // Chain not added, request add
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${TIRAMISU_CHAIN_ID.toString(16)}`,
            chainName: "Arkiv Tiramisu Testnet",
            nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
            rpcUrls: [ARKIV_HTTP_RPC],
            blockExplorerUrls: [ARKIV_EXPLORER_URL],
          },
        ],
      });
    }
  }

  const client = createWalletClient({
    chain: tiramisu,
    transport: custom(ethereum),
    account,
  });

  return { account, client };
}

/**
 * Generates an ephemeral Burner Wallet Client on Tiramisu as a fallback.
 */
export function getBurnerWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    client: createWalletClient({
      chain: tiramisu,
      transport: http(ARKIV_HTTP_RPC),
      account,
    }),
  };
}

/**
 * Retrieves or generates a persistent demo session burner key in the browser.
 */
export function getOrCreateDemoPrivateKey(): `0x${string}` {
  if (typeof window === "undefined") {
    return "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  }

  const STORAGE_KEY = "zkupi_burner_pk";
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing && existing.startsWith("0x") && existing.length === 66) {
    return existing as `0x${string}`;
  }

  const generated = generatePrivateKey();
  localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}
