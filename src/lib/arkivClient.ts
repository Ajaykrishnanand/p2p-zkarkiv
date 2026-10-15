import {
  createPublicClient,
  createWalletClient,
} from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http, webSocket } from "viem";
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
 * Generates an ephemeral Burner Wallet Client on Tiramisu.
 * Allows hackathon judges to test the app without manual wallet setup.
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
