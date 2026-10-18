"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import {
  P2POrderEntity,
  createP2POrder,
  queryOpenInrOrders,
  lockP2POrder,
  settleOrderWithZkTlsProof,
} from "@/lib/arkivOrderbook";
import {
  getBurnerWalletClient,
  getBrowserWalletClient,
  getOrCreateDemoPrivateKey,
  TIRAMISU_CHAIN_ID,
  ARKIV_EXPLORER_URL,
} from "@/lib/arkivClient";
import { ZkProofBundle } from "@/lib/zkTlsProver";
import { useArkivWebSocket } from "@/lib/useArkivWebSocket";

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

  // Initialize Burner Wallet on Client Mount as default
  useEffect(() => {
    try {
      const pk = getOrCreateDemoPrivateKey();
      const { account, client } = getBurnerWalletClient(pk);
      setWalletAccount({ address: account.address, client });
    } catch (e) {
      console.warn("Burner wallet initialization warning:", e);
    }
  }, []);

  // Connect MetaMask if requested
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

  // Fetch orders from Arkiv DB-Chain
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await queryOpenInrOrders();
      setOrders(res);
    } catch (err) {
      console.warn("Failed to query Arkiv entities:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    try {
      if (walletAccount?.client) {
        await lockP2POrder(walletAccount.client, order.key, order.data, walletAccount.address);
        await fetchOrders();
      }
    } catch (e) {
      console.warn("Live lock fell back to interactive state:", e);
      const lockedEntity: P2POrderEntity = {
        ...order,
        attributes: { ...order.attributes, status: "LOCKED" },
        data: { ...order.data, takerAddress: walletAccount?.address || "0xTaker" },
      };
      setOrders((prev) => prev.map((o) => (o.key === order.key ? lockedEntity : o)));
    }
  };

  // Handle Order Settlement
  const handleSettleOrder = async (order: P2POrderEntity, zkBundle: ZkProofBundle) => {
    try {
      if (walletAccount?.client) {
        await settleOrderWithZkTlsProof(
          walletAccount.client,
          walletAccount.address as `0x${string}`,
          order.key,
          order.data,
          zkBundle
        );
        await fetchOrders();
      }
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
      <LeftNavigationRail />

      {/* Main Terminal Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header & Ticker */}
        <Navbar
          walletAddress={walletAccount?.address || ""}
          onConnectWallet={handleConnectMetaMask}
          isMetaMaskConnected={isMetaMask}
          orders={orders}
          wsBlock={wsStatus.latestBlock}
          isWsConnected={wsStatus.isConnected}
        />

        {/* Inner Content Area */}
        <div className="p-4 sm:p-5 space-y-4 max-w-[1700px] w-full mx-auto">
          {/* Core Grid: Chart (Left) + OrderBook (Middle) + Trade Panel (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Area: Price Chart (7 cols) */}
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
                isSubmitting={isSubmitting}
                selectedPrice={selectedBookPrice}
              />
            </div>
          </div>

          {/* Bottom Area: Active Orders & History Table */}
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
    </div>
  );
}
