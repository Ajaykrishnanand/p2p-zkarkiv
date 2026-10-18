"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
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
import { generateSyntheticUpi } from "@/lib/syntheticGuard";

export default function Home() {
  const [walletAccount, setWalletAccount] = useState<{
    address: string;
    client: any;
  } | null>(null);

  const [isMetaMask, setIsMetaMask] = useState<boolean>(false);
  const [orders, setOrders] = useState<P2POrderEntity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isJudgeDemoActive, setIsJudgeDemoActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedBookPrice, setSelectedBookPrice] = useState<number | undefined>(undefined);

  // Modals
  const [orderToLock, setOrderToLock] = useState<P2POrderEntity | null>(null);
  const [inspectedEntity, setInspectedEntity] = useState<P2POrderEntity | null>(null);

  // 1-Click Judge Demo Step State
  const [judgeStep, setJudgeStep] = useState<number>(1);
  const [judgeDemoOrder, setJudgeDemoOrder] = useState<P2POrderEntity | null>(null);
  const [judgeStatusMsg, setJudgeStatusMsg] = useState<string | null>(null);

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
      setJudgeStatusMsg(`Connected MetaMask: ${account.slice(0, 8)}...`);
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
      if (judgeDemoOrder) {
        const updated = res.find((o) => o.key === judgeDemoOrder.key);
        if (updated) setJudgeDemoOrder(updated);
      }
    } catch (err) {
      console.warn("Failed to query Arkiv entities:", err);
    } finally {
      setIsLoading(false);
    }
  }, [judgeDemoOrder]);

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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Order Lock
  const handleLockOrder = async (order: P2POrderEntity) => {
    if (!walletAccount) throw new Error("Wallet signer not ready");
    await lockP2POrder(walletAccount.client, order.key, order.data, walletAccount.address);
    await fetchOrders();
  };

  // Handle Order Settlement
  const handleSettleOrder = async (order: P2POrderEntity, zkBundle: ZkProofBundle) => {
    if (!walletAccount) throw new Error("Wallet signer not ready");
    await settleOrderWithZkTlsProof(
      walletAccount.client,
      walletAccount.address as `0x${string}`,
      order.key,
      order.data,
      zkBundle
    );
    await fetchOrders();
  };

  // 1-Click Judge Demo Step 1: Create Order
  const handleJudgeStep1 = async () => {
    if (!walletAccount) return;
    try {
      setJudgeStatusMsg("Submitting createEntity to Arkiv Tiramisu...");
      const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      const syntheticAlias = generateSyntheticUpi("judge", "okhdfc");

      const tx = await createP2POrder(walletAccount.client, {
        orderId,
        makerAddress: walletAccount.address,
        amountInr: 5000,
        usdcAmount: "57.14",
        rateInrPerUsdc: 87.5,
        syntheticUpiAlias: syntheticAlias,
        ttlMinutes: 60,
      });

      await fetchOrders();

      const newEntity: P2POrderEntity = {
        key: tx.key,
        attributes: {
          status: "OPEN",
          amountInr: 5000n,
          rate: 87n,
          fiatCurrency: "INR",
          entityType: "p2p_order",
          zkVerified: false,
        },
        data: {
          orderId,
          makerAddress: walletAccount.address,
          usdcAmount: "57.14",
          syntheticUpiAlias: syntheticAlias,
          createdAt: new Date().toISOString(),
          takerAddress: null,
          zkProofSummary: null,
          nullifierEntityKey: null,
        },
      };

      setJudgeDemoOrder(newEntity);
      setJudgeStep(2);
      setJudgeStatusMsg(`Created Entity Key: ${tx.key?.slice(0, 16)}...`);
    } catch (err: any) {
      setJudgeStatusMsg(`Step 1 Notice: ${err?.message || "Signer requires test GLM tokens or gas confirmation"}`);
    }
  };

  // 1-Click Judge Demo Step 2: Lock Order
  const handleJudgeStep2 = async () => {
    if (!walletAccount || !judgeDemoOrder) return;
    try {
      setJudgeStatusMsg("Executing patchEntity: status LOCKED (30m TTL)...");
      await lockP2POrder(walletAccount.client, judgeDemoOrder.key, judgeDemoOrder.data, walletAccount.address);
      await fetchOrders();
      setJudgeStep(3);
      setJudgeStatusMsg("Order locked on-chain. Ready for zkTLS Settlement.");
    } catch (err: any) {
      setJudgeStatusMsg(`Step 2 Error: ${err?.message}`);
    }
  };

  // 1-Click Judge Demo Step 3: Settle
  const handleJudgeStep3 = () => {
    if (!judgeDemoOrder) return;
    setOrderToLock(judgeDemoOrder);
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
          isJudgeDemoActive={isJudgeDemoActive}
          onToggleDemoMode={() => setIsJudgeDemoActive(!isJudgeDemoActive)}
          onConnectWallet={handleConnectMetaMask}
          isMetaMaskConnected={isMetaMask}
          orders={orders}
        />

        {/* Inner Content Area */}
        <div className="p-4 sm:p-5 space-y-4 max-w-[1700px] w-full mx-auto">
          {/* 45-Second Judge Evaluation Control Bar */}
          {isJudgeDemoActive && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-emerald-50 text-emerald-600 font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">
                    45-Second Judge Evaluation Flow
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    All 5 Core Features Active
                  </span>
                  <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Base Sepolia Escrow (contracts/BaseSepoliaEscrow.sol)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Zero Indian Bank Account Needed</span>
                  <a
                    href="https://hub.arkiv.network/faucet"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Get Free Test GLM →
                  </a>
                </div>
              </div>

              {/* 3 Step Interactive Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                {/* Step 1 */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    judgeStep === 1
                      ? "bg-emerald-50/50 border-emerald-300 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 opacity-70"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-800">1. createEntity</span>
                    <span className="text-[10px] font-mono text-emerald-700">60m TTL</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Post ₹5,000 INR order with synthetic alias <code className="text-slate-800 font-bold">*.synth@upi</code>.
                  </p>
                  <button
                    onClick={handleJudgeStep1}
                    disabled={judgeStep !== 1}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-40 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Post Order on Arkiv</span>
                  </button>
                </div>

                {/* Step 2 */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    judgeStep === 2
                      ? "bg-amber-50/50 border-amber-300 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 opacity-70"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-800">2. patchEntity</span>
                    <span className="text-[10px] font-mono text-amber-700">30m Lock</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Lock order as Buyer to prevent double-swaps while simulated UPI is processed.
                  </p>
                  <button
                    onClick={handleJudgeStep2}
                    disabled={judgeStep !== 2}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-40 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Order (Buyer)</span>
                  </button>
                </div>

                {/* Step 3 */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    judgeStep === 3
                      ? "bg-blue-50/50 border-blue-300 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 opacity-70"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-800">3. predictEntityKey</span>
                    <span className="text-[10px] font-mono text-blue-700">zkTLS Settle</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Compute Poseidon nullifier, predict key, and settle trade atomically.
                  </p>
                  <button
                    onClick={handleJudgeStep3}
                    disabled={judgeStep !== 3}
                    className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-40 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate ZK Proof & Settle</span>
                  </button>
                </div>
              </div>

              {judgeStatusMsg && (
                <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
                  <span>{judgeStatusMsg}</span>
                  {judgeDemoOrder && (
                    <button
                      onClick={() => setInspectedEntity(judgeDemoOrder)}
                      className="text-emerald-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Inspect Raw Entity
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

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
