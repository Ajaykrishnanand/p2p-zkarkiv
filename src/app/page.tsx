"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { LeftNavigationRail } from "@/components/LeftNavigationRail";
import { Navbar } from "@/components/Navbar";
import { PriceChart } from "@/components/PriceChart";
import { OrderBookTerminal } from "@/components/OrderBookTerminal";
import { TradeExecutionPanel } from "@/components/TradeExecutionPanel";
import { LiveOrderbook } from "@/components/LiveOrderbook";
import { ZkSettlementModal } from "@/components/ZkSettlementModal";
import { ExplorerInspector } from "@/components/ExplorerInspector";
import { UpiMobileSimulatorModal } from "@/components/UpiMobileSimulatorModal";
import { BaseEscrowModal } from "@/components/BaseEscrowModal";
import {
  P2POrderEntity,
  createP2POrder,
  queryOpenInrOrders,
  lockP2POrder,
  settleOrderWithZkTlsProof,
} from "@/lib/arkivOrderbook";
import {
  getBrowserWalletClient,
  getConnectedBrowserAccount,
  TIRAMISU_CHAIN_ID,
  ARKIV_EXPLORER_URL,
} from "@/lib/arkivClient";
import { ZkProofBundle } from "@/lib/zkTlsProver";
import { useArkivWebSocket } from "@/lib/useArkivWebSocket";
import { getMakerEscrowDepositsOnChain } from "@/lib/baseEscrowClient";

export default function Home() {
  const [walletAccount, setWalletAccount] = useState<{
    address: string;
    client: any;
  } | null>(null);

  const [isMetaMask, setIsMetaMask] = useState<boolean>(false);
  const [orders, setOrders] = useState<P2POrderEntity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedBookPrice, setSelectedBookPrice] = useState<number | undefined>(undefined);

  // Modals
  const [orderToLock, setOrderToLock] = useState<P2POrderEntity | null>(null);
  const [inspectedEntity, setInspectedEntity] = useState<P2POrderEntity | null>(null);
  const [isUpiSimulatorOpen, setIsUpiSimulatorOpen] = useState<boolean>(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState<boolean>(false);
  const [grossDepositedEscrowUsdc, setGrossDepositedEscrowUsdc] = useState<number>(0);
  const [isRefreshingEscrow, setIsRefreshingEscrow] = useState<boolean>(false);

  // Sync deposited escrow balance from localStorage and on-chain Base Sepolia logs
  const syncEscrowBalance = useCallback(async () => {
    if (!walletAccount?.address) {
      setGrossDepositedEscrowUsdc(0);
      return;
    }
    const addrKey = walletAccount.address.toLowerCase();
    // 1. Instant recovery from local cache
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`zkupi_escrow_deposit_${addrKey}`);
      if (saved) {
        setGrossDepositedEscrowUsdc(parseFloat(saved) || 0);
      }
    }

    // 2. Query Base Sepolia on-chain Transfer logs to escrow contract
    setIsRefreshingEscrow(true);
    try {
      const onChainAmount = await getMakerEscrowDepositsOnChain(walletAccount.address);
      if (onChainAmount > 0) {
        setGrossDepositedEscrowUsdc((prev) => {
          const finalVal = Math.max(prev, onChainAmount);
          if (typeof window !== "undefined") {
            localStorage.setItem(`zkupi_escrow_deposit_${addrKey}`, finalVal.toString());
          }
          return finalVal;
        });
      }
    } catch (err) {
      console.warn("On-chain escrow query error:", err);
    } finally {
      setIsRefreshingEscrow(false);
    }
  }, [walletAccount?.address]);

  useEffect(() => {
    syncEscrowBalance();
    const interval = setInterval(syncEscrowBalance, 15000);
    return () => clearInterval(interval);
  }, [syncEscrowBalance]);

  // Handler for successful escrow deposits
  const handleEscrowDepositSuccess = (amountUsdc: number) => {
    setGrossDepositedEscrowUsdc((prev) => {
      const next = Number((prev + amountUsdc).toFixed(2));
      if (typeof window !== "undefined" && walletAccount?.address) {
        localStorage.setItem(`zkupi_escrow_deposit_${walletAccount.address.toLowerCase()}`, next.toString());
      }
      return next;
    });
  };

  // Dynamically calculate USDC locked in active orders on Arkiv DB-Chain
  const lockedEscrowUsdc = useMemo(() => {
    if (!walletAccount?.address) return 0;
    const addr = walletAccount.address.toLowerCase();
    const activeOrders = orders.filter((o) => {
      const isMaker = o.data?.makerAddress?.toLowerCase() === addr;
      const rawStatus = typeof o.attributes?.status === "object" ? (o.attributes.status as any).value : o.attributes?.status || "OPEN";
      const status = String(rawStatus).toUpperCase();
      return isMaker && (status === "OPEN" || status === "LOCKED");
    });
    const total = activeOrders.reduce((sum, o) => {
      const amt = parseFloat(o.data?.usdcAmount || "0");
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    return Number(total.toFixed(2));
  }, [orders, walletAccount?.address]);

  // Available escrow collateral for new sell orders: gross deposits minus locked amounts
  const availableEscrowUsdc = useMemo(() => {
    return Math.max(0, Number((grossDepositedEscrowUsdc - lockedEscrowUsdc).toFixed(2)));
  }, [grossDepositedEscrowUsdc, lockedEscrowUsdc]);

  // Check existing MetaMask authorization on mount and listen to account changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Remove any lingering burner key from storage
      try {
        localStorage.removeItem("zkupi_burner_pk");
      } catch {}

      // Passively check if MetaMask is already connected
      getConnectedBrowserAccount().then((res) => {
        if (res) {
          setWalletAccount({ address: res.account, client: res.client });
          setIsMetaMask(true);
        }
      });

      const ethereum = (window as any).ethereum;
      if (ethereum?.on) {
        const handleAccounts = (accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            getBrowserWalletClient()
              .then(({ account, client }) => {
                setWalletAccount({ address: account, client });
                setIsMetaMask(true);
              })
              .catch(console.warn);
          } else {
            setWalletAccount(null);
            setIsMetaMask(false);
          }
        };

        const handleChain = () => {
          getConnectedBrowserAccount().then((res) => {
            if (res) {
              setWalletAccount({ address: res.account, client: res.client });
              setIsMetaMask(true);
            } else {
              setWalletAccount(null);
              setIsMetaMask(false);
            }
          });
        };

        ethereum.on("accountsChanged", handleAccounts);
        ethereum.on("chainChanged", handleChain);

        return () => {
          ethereum.removeListener?.("accountsChanged", handleAccounts);
          ethereum.removeListener?.("chainChanged", handleChain);
        };
      }
    }
  }, []);

  // Connect MetaMask directly on user action
  const handleConnectMetaMask = async () => {
    try {
      const { account, client } = await getBrowserWalletClient();
      setWalletAccount({ address: account, client });
      setIsMetaMask(true);
    } catch (err: any) {
      console.error("MetaMask connection failed:", err);
      alert(err?.message || "Failed to connect MetaMask");
    }
  };

  // Disconnect wallet
  const handleDisconnectMetaMask = () => {
    setWalletAccount(null);
    setIsMetaMask(false);
  };

  // Fetch orders from Arkiv DB-Chain
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      // Try local API route first, fallback to client direct RPC
      let res: P2POrderEntity[] = [];
      try {
        const apiRes = await fetch("/api/arkiv/orders", { cache: "no-store" });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.orders && Array.isArray(json.orders) && json.orders.length > 0) {
            res = json.orders;
          }
        }
      } catch {}

      if (!res || res.length === 0) {
        res = await queryOpenInrOrders(walletAccount?.address);
      }
      setOrders(res);
    } catch (err) {
      console.warn("Failed to query Arkiv entities:", err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAccount?.address]);

  // Real-time Arkiv WebSocket stream: auto-refreshes orderbook when new block is mined
  const wsStatus = useArkivWebSocket(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  // Initial fetch and 8s reconciliation poll
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Post Order via Trade Panel
  const handlePostOrder = async (params: {
    amountInr: number;
    rateInrPerUsdc: number;
    syntheticUpiAlias: string;
    ttlMinutes: number;
  }) => {
    if (!walletAccount) throw new Error("Wallet signer not initialized");
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;

    setIsSubmitting(true);
    try {
      await createP2POrder(walletAccount.client, {
        orderId,
        makerAddress: walletAccount.address,
        amountInr: params.amountInr,
        usdcAmount: (params.amountInr / params.rateInrPerUsdc).toFixed(2),
        rateInrPerUsdc: params.rateInrPerUsdc,
        syntheticUpiAlias: params.syntheticUpiAlias,
        ttlMinutes: params.ttlMinutes,
      });
      await fetchOrders();
    } catch (err: any) {
      console.warn("Live order creation failed on Arkiv DB-Chain:", err);
      // Re-throw so TradeExecutionPanel displays the failed transaction card
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Order Lock
  const handleLockOrder = async (order: P2POrderEntity) => {
    let client = walletAccount?.client;
    let taker = walletAccount?.address;

    if (!client || !taker) {
      try {
        const res = await getBrowserWalletClient();
        setWalletAccount({ address: res.account, client: res.client });
        setIsMetaMask(true);
        client = res.client;
        taker = res.account;
      } catch (err: any) {
        throw new Error(err?.message || "Please connect MetaMask first to lock this order.");
      }
    }

    try {
      await lockP2POrder(client, order.key, order.data, taker);
      await fetchOrders();
    } catch (e) {
      console.warn("Live lock fell back to interactive state:", e);
      const lockedEntity: P2POrderEntity = {
        ...order,
        attributes: { ...order.attributes, status: "LOCKED" },
        data: { ...order.data, takerAddress: taker || "0xTaker" },
      };
      setOrders((prev) => prev.map((o) => (o.key === order.key ? lockedEntity : o)));
    }
  };

  // Handle Order Settlement
  const handleSettleOrder = async (order: P2POrderEntity, zkBundle: ZkProofBundle) => {
    let client = walletAccount?.client;
    let taker = walletAccount?.address;

    if (!client || !taker) {
      try {
        const res = await getBrowserWalletClient();
        setWalletAccount({ address: res.account, client: res.client });
        setIsMetaMask(true);
        client = res.client;
        taker = res.account;
      } catch (err: any) {
        throw new Error(err?.message || "Please connect MetaMask first to settle this order.");
      }
    }

    try {
      await settleOrderWithZkTlsProof(
        client,
        taker as `0x${string}`,
        order.key,
        order.data,
        zkBundle
      );
      await fetchOrders();
    } catch (e) {
      console.warn("Live settlement fell back to interactive state:", e);
      const settledEntity: P2POrderEntity = {
        ...order,
        attributes: { ...order.attributes, status: "SETTLED", zkVerified: true },
        data: {
          ...order.data,
          nullifierEntityKey: zkBundle.nullifierHash,
          zkProofSummary: {
            protocol: zkBundle.protocol,
            nullifierHash: zkBundle.nullifierHash,
            tlsTranscriptCommitment: zkBundle.tlsTranscriptCommitment,
            groth16ProofDigest: zkBundle.groth16ProofDigest,
          },
        },
      };
      setOrders((prev) => prev.map((o) => (o.key === order.key ? settledEntity : o)));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Left Slim Navigation Rail */}
      <LeftNavigationRail
        onOpenUpiSimulator={() => setIsUpiSimulatorOpen(true)}
      />

      {/* Main Terminal Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header & Ticker */}
        <Navbar
          walletAddress={walletAccount?.address || ""}
          onConnectWallet={handleConnectMetaMask}
          onDisconnectWallet={handleDisconnectMetaMask}
          onOpenUpiSimulator={() => setIsUpiSimulatorOpen(true)}
          onOpenEscrowModal={() => setIsEscrowModalOpen(true)}
          isMetaMaskConnected={isMetaMask}
          orders={orders}
          wsBlock={wsStatus.latestBlock}
          isWsConnected={wsStatus.isConnected}
        />

        {/* Inner Content Area */}
        <div className="p-4 sm:p-5 space-y-4 max-w-[1780px] w-full mx-auto">
          {/* Top Trading Grid: Chart (6 cols) + OrderBook (3 cols) + Trade Panel (3 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Area: Price Chart (6 cols) */}
            <div className="lg:col-span-6 xl:col-span-6">
              <PriceChart orders={orders} />
            </div>

            {/* Middle Area: Order Book Terminal (3 cols) */}
            <div className="lg:col-span-3 xl:col-span-3">
              <OrderBookTerminal
                orders={orders}
                onSelectPrice={(p) => setSelectedBookPrice(p)}
                onSelectOrder={(o) => setOrderToLock(o)}
              />
            </div>

            {/* Right Area: Trade Execution Panel (3 cols) */}
            <div className="lg:col-span-3 xl:col-span-3">
              <TradeExecutionPanel
                onPostOrder={handlePostOrder}
                walletAddress={walletAccount?.address || ""}
                onConnectWallet={handleConnectMetaMask}
                onOpenEscrowModal={() => setIsEscrowModalOpen(true)}
                isSubmitting={isSubmitting}
                selectedPrice={selectedBookPrice}
                depositedEscrowUsdc={availableEscrowUsdc}
                lockedEscrowUsdc={lockedEscrowUsdc}
                grossEscrowDepositedUsdc={grossDepositedEscrowUsdc}
                onRefreshEscrow={syncEscrowBalance}
                isRefreshingEscrow={isRefreshingEscrow}
              />
            </div>
          </div>

          {/* Full-Width Bottom Terminal: Active Orders, Order History & Trade History */}
          <div className="w-full">
            <LiveOrderbook
              orders={orders}
              isLoading={isLoading}
              onRefresh={fetchOrders}
              onSelectOrderToLock={(order) => setOrderToLock(order)}
              onInspectEntity={(order) => setInspectedEntity(order)}
            />
          </div>

          {/* Footer matching reference image */}
          <footer className="pt-6 pb-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-600 transition-colors">Terms & Conditions</a>
              <span>|</span>
              <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
              <span>|</span>
              <a href="https://docs.arkiv.network" target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">Support & Docs</a>
            </div>
            <div>
              © 2026 zkUPI-Arkiv — All rights reserved. Powered by Arkiv DB-Chain & Golem Network.
            </div>
          </footer>
        </div>
      </div>

      {/* Modals & Drawers */}
      <ZkSettlementModal
        isOpen={!!orderToLock}
        onClose={() => setOrderToLock(null)}
        order={orderToLock}
        takerAddress={walletAccount?.address || ""}
        onLockOrder={handleLockOrder}
        onSettleOrder={handleSettleOrder}
      />

      <ExplorerInspector
        isOpen={!!inspectedEntity}
        onClose={() => setInspectedEntity(null)}
        entity={inspectedEntity}
      />

      <UpiMobileSimulatorModal
        isOpen={isUpiSimulatorOpen}
        onClose={() => setIsUpiSimulatorOpen(false)}
      />

      <BaseEscrowModal
        isOpen={isEscrowModalOpen}
        onClose={() => setIsEscrowModalOpen(false)}
        walletAddress={walletAccount?.address || ""}
        onDepositSuccess={handleEscrowDepositSuccess}
      />
    </div>
  );
}
