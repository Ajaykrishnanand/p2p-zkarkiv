import {
  createPublicClient,
  createWalletClient,
} from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http, webSocket, custom, publicActions } from "viem";
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
 * Switches to Arkiv Tiramisu Testnet or prompts MetaMask to add it.
 */
export async function switchOrAddTiramisuNetwork(ethereum: any) {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${TIRAMISU_CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError: any) {
    // Chain not added (4902)
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
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
}

/**
 * Wraps browser MetaMask EIP-1193 provider with Arkiv HTTP RPC fast-path.
 * Interactive/signature methods (sendTransaction, personal_sign) prompt MetaMask,
 * while read/polling methods (eth_blockNumber, eth_getTransactionReceipt) resolve
 * in <20ms directly against the Arkiv node, avoiding MetaMask polling delays.
 */
export function createHybridEthereumProvider(ethereum: any) {
  if (!ethereum) return ethereum;
  return {
    async request({ method, params }: { method: string; params?: any[] }) {
      if (
        method === "eth_sendTransaction" ||
        method === "personal_sign" ||
        method === "eth_signTypedData" ||
        method === "eth_signTypedData_v4" ||
        method === "eth_requestAccounts" ||
        method === "eth_accounts" ||
        method === "wallet_switchEthereumChain" ||
        method === "wallet_addEthereumChain"
      ) {
        return await ethereum.request({ method, params });
      }

      try {
        const res = await fetch(ARKIV_HTTP_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params: params || [],
          }),
        });
        const data = await res.json();
        if (data.error) {
          if (ethereum?.request) {
            return await ethereum.request({ method, params });
          }
          throw new Error(data.error.message || JSON.stringify(data.error));
        }
        return data.result;
      } catch (err) {
        return await ethereum.request({ method, params });
      }
    },
    on(event: string, handler: any) {
      if (ethereum?.on) ethereum.on(event, handler);
    },
    removeListener(event: string, handler: any) {
      if (ethereum?.removeListener) ethereum.removeListener(event, handler);
    },
  };
}

/**
 * Passively checks if MetaMask is already connected without popping up approval modal.
 */
export async function getConnectedBrowserAccount(): Promise<{ account: `0x${string}`; client: any } | null> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return null;
  }
  const ethereum = (window as any).ethereum;
  try {
    const accounts = (await ethereum.request({ method: "eth_accounts" })) as string[];
    if (!accounts || accounts.length === 0) {
      return null;
    }
    const account = accounts[0] as `0x${string}`;
    const hybridProvider = createHybridEthereumProvider(ethereum);
    const client = createWalletClient({
      chain: tiramisu,
      transport: custom(hybridProvider),
      account,
      pollingInterval: 1000,
    }).extend(publicActions);
    return { account, client };
  } catch (e) {
    console.warn("Passive MetaMask account check:", e);
    return null;
  }
}

/**
 * Connects directly to MetaMask or browser EIP-1193 wallet to sign live on-chain transactions.
 */
export async function getBrowserWalletClient() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Web3 wallet (MetaMask) detected. Please install MetaMask to continue.");
  }

  const ethereum = (window as any).ethereum;

  // Request accounts
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts authorized in MetaMask.");
  }

  const account = accounts[0] as `0x${string}`;

  // Ensure network is Tiramisu Testnet
  await switchOrAddTiramisuNetwork(ethereum);

  const hybridProvider = createHybridEthereumProvider(ethereum);
  const client = createWalletClient({
    chain: tiramisu,
    transport: custom(hybridProvider),
    account,
    pollingInterval: 1000,
  }).extend(publicActions);

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
