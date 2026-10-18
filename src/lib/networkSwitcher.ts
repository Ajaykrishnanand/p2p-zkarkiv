import { TIRAMISU_CHAIN_ID, ARKIV_HTTP_RPC, ARKIV_EXPLORER_URL } from "./arkivClient";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_RPC,
  BASE_SEPOLIA_EXPLORER,
  BASE_SEPOLIA_ESCROW_ADDRESS,
} from "./baseEscrowClient";

export interface NetworkConfig {
  id: number;
  hexChainId: string;
  name: string;
  shortName: string;
  currency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  explorerUrl: string;
  color: "emerald" | "blue";
  tag: string;
  description: string;
}

export const NETWORKS: Record<number, NetworkConfig> = {
  [TIRAMISU_CHAIN_ID]: {
    id: TIRAMISU_CHAIN_ID,
    hexChainId: `0x${TIRAMISU_CHAIN_ID.toString(16)}`,
    name: "Arkiv Tiramisu Testnet",
    shortName: "Arkiv DB-Chain",
    currency: { name: "GLM", symbol: "GLM", decimals: 18 },
    rpcUrl: ARKIV_HTTP_RPC,
    explorerUrl: ARKIV_EXPLORER_URL,
    color: "emerald",
    tag: "Orderbook & zkTLS",
    description: "Decentralized P2P order entities, entity queries, and UTR nullifiers",
  },
  [BASE_SEPOLIA_CHAIN_ID]: {
    id: BASE_SEPOLIA_CHAIN_ID,
    hexChainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}`,
    name: "Base Sepolia",
    shortName: "Base Sepolia",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrl: BASE_SEPOLIA_RPC,
    explorerUrl: BASE_SEPOLIA_EXPLORER,
    color: "blue",
    tag: "USDC Escrow",
    description: `USDC Escrow Contract (${BASE_SEPOLIA_ESCROW_ADDRESS.slice(0, 6)}...${BASE_SEPOLIA_ESCROW_ADDRESS.slice(-4)})`,
  },
};

/**
 * Gets current active chain ID from window.ethereum.
 */
export async function getCurrentChainId(): Promise<number | null> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return null;
  }
  try {
    const hex = await (window as any).ethereum.request({ method: "eth_chainId" });
    return parseInt(hex, 16);
  } catch (err) {
    console.warn("Failed to get eth_chainId:", err);
    return null;
  }
}

/**
 * Switches MetaMask to the requested network with automatic wallet_addEthereumChain fallback.
 */
export async function switchNetwork(chainId: number): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to switch networks.");
  }
  const ethereum = (window as any).ethereum;
  const target = NETWORKS[chainId];
  if (!target) {
    throw new Error(`Unsupported network chain ID: ${chainId}`);
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: target.hexChainId }],
    });
    return true;
  } catch (switchError: any) {
    // Error 4902 means the chain has not been added to MetaMask yet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: target.hexChainId,
            chainName: target.name,
            nativeCurrency: target.currency,
            rpcUrls: [target.rpcUrl],
            blockExplorerUrls: [target.explorerUrl],
          },
        ],
      });
      return true;
    }
    throw switchError;
  }
}
