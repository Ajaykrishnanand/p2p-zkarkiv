"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Zap,
  Plus,
  ArrowRight,
  RefreshCw,
  Database,
  Lock,
  CheckCircle2,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LiveOrderbook } from "@/components/LiveOrderbook";
import { CreateOrderModal } from "@/components/CreateOrderModal";
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
  getOrCreateDemoPrivateKey,
  TIRAMISU_CHAIN_ID,
  ARKIV_EXPLORER_URL,
} from "@/lib/arkivClient";
import { ZkProofBundle } from "@/lib/zkTlsProver";
import { generateSyntheticUpi } from "@/lib/syntheticGuard";

export default function Home() {
  const [burnerAccount, setBurnerAccount] = useState<{
    address: string;
    client: any;
  } | null>(null);

  const [orders, setOrders] = useState<P2POrderEntity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isJudgeDemoActive, setIsJudgeDemoActive] = useState<boolean>(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [orderToLock, setOrderToLock] = useState<P2POrderEntity | null>(null);
  const [inspectedEntity, setInspectedEntity] = useState<P2POrderEntity | null>(null);

  // 1-Click Judge Demo Step State
  const [judgeStep, setJudgeStep] = useState<number>(1);
  const [judgeDemoOrder, setJudgeDemoOrder] = useState<P2POrderEntity | null>(null);
  const [judgeStatusMsg, setJudgeStatusMsg] = useState<string | null>(null);

  // Initialize Burner Wallet on Client Mount
  useEffect(() => {
    const pk = getOrCreateDemoPrivateKey();
    const { account, client } = getBurnerWalletClient(pk);
    setBurnerAccount({ address: account.address, client });
  }, []);

  // Fetch orders from Arkiv DB-Chain
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await queryOpenInrOrders();
      setOrders(res);
      // Auto-update judgeDemoOrder if already present
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

  // Initial fetch and 8s reconciliation poll (hybrid sync)
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Handle Order Creation
  const handleCreateOrder = async (params: {
    amountInr: number;
    rateInrPerUsdc: number;
    syntheticUpiAlias: string;
    ttlMinutes: number;
  }) => {
    if (!burnerAccount) throw new Error("Wallet client not ready");
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;

    const tx = await createP2POrder(burnerAccount.client, {
      orderId,
      makerAddress: burnerAccount.address,
      amountInr: params.amountInr,
      usdcAmount: (params.amountInr / params.rateInrPerUsdc).toFixed(2),
      rateInrPerUsdc: params.rateInrPerUsdc,
      syntheticUpiAlias: params.syntheticUpiAlias,
      ttlMinutes: params.ttlMinutes,
    });

    await fetchOrders();
    return tx;
  };

  // Handle Order Lock
  const handleLockOrder = async (order: P2POrderEntity) => {
    if (!burnerAccount) throw new Error("Wallet client not ready");
    await lockP2POrder(burnerAccount.client, order.key, order.data, burnerAccount.address);
    await fetchOrders();
  };

  // Handle Order Settlement
  const handleSettleOrder = async (order: P2POrderEntity, zkBundle: ZkProofBundle) => {
    if (!burnerAccount) throw new Error("Wallet client not ready");
    await settleOrderWithZkTlsProof(
      burnerAccount.client,
      burnerAccount.address as `0x${string}`,
      order.key,
      order.data,
      zkBundle
    );
    await fetchOrders();
  };

  // 1-Click Judge Demo Step 1: Create Order
  const handleJudgeStep1 = async () => {
    if (!burnerAccount) return;
    try {
      setJudgeStatusMsg("Executing createEntity on Tiramisu...");
      const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      const syntheticAlias = generateSyntheticUpi("judge", "okhdfc");

      const tx = await createP2POrder(burnerAccount.client, {
        orderId,
        makerAddress: burnerAccount.address,
        amountInr: 5000,
        usdcAmount: "57.47",
        rateInrPerUsdc: 87,
        syntheticUpiAlias: syntheticAlias,
        ttlMinutes: 60,
      });

      await fetchOrders();

      // Find the created order
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
          makerAddress: burnerAccount.address,
          usdcAmount: "57.47",
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
      setJudgeStatusMsg(`Step 1 Error: ${err?.message}`);
    }
  };

  // 1-Click Judge Demo Step 2: Lock Order
  const handleJudgeStep2 = async () => {
    if (!burnerAccount || !judgeDemoOrder) return;
    try {
      setJudgeStatusMsg("Calling patchEntity to set status: LOCKED (30m TTL)...");
      await lockP2POrder(burnerAccount.client, judgeDemoOrder.key, judgeDemoOrder.data, burnerAccount.address);
      await fetchOrders();
      setJudgeStep(3);
      setJudgeStatusMsg("Order locked. Ready for zkTLS Proof settlement.");
    } catch (err: any) {
      setJudgeStatusMsg(`Step 2 Error: ${err?.message}`);
    }
  };

  // 1-Click Judge Demo Step 3: Open Settlement Modal
  const handleJudgeStep3 = () => {
    if (!judgeDemoOrder) return;
    setOrderToLock(judgeDemoOrder);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar
        walletAddress={burnerAccount?.address || ""}
        isJudgeDemoActive={isJudgeDemoActive}
        onToggleDemoMode={() => setIsJudgeDemoActive(!isJudgeDemoActive)}
        onRefreshOrders={fetchOrders}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/40 to-zinc-950 p-6 sm:p-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Arkiv Global Tour Stop • Road to Devcon 8 Mumbai</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Censorship-Resistant, Zero-Knowledge P2P UPI Orderbook on <span className="text-emerald-400">Arkiv</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Decentralized INR-to-USDC liquidity with auto-expiring quotes (`ExpirationTime`), zero real PII stored on-chain (`*.synth@upi`), and client-side zkTLS notarized proofs preventing fake screenshot fraud.
            </p>

            {/* Quick Metrics Bar */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-500 block">Tiramisu Testnet</span>
                <span className="text-white font-mono font-bold text-sm">Chain {TIRAMISU_CHAIN_ID}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-500 block">Decentralized Orders</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">{orders.length} Active</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-500 block">Settlement Layer</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">zkTLS Groth16</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-500 block">Zero-PII Gate</span>
                <span className="text-amber-400 font-mono font-bold text-sm">100% Enforced</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Judge 45-Second Demo Box */}
        {isJudgeDemoActive && (
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/10 p-6 space-y-4 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                <span>45-Second Judge Evaluation Flow (Zero Setup Needed)</span>
              </div>
              <span className="text-xs text-zinc-400">
                Experience all 5 Arkiv SDK features in 3 clicks using an ephemeral burner wallet.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  judgeStep === 1
                    ? "bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-950/40"
                    : "bg-zinc-950 border-zinc-800 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-emerald-400">Step 1: createEntity</span>
                  <span className="text-zinc-500 font-mono">60m TTL</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Post ₹5,000 INR order with synthetic alias <code className="text-zinc-200">*.synth@upi</code>.
                </p>
                <button
                  onClick={handleJudgeStep1}
                  disabled={judgeStep !== 1}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Order on Arkiv</span>
                </button>
              </div>

              {/* Step 2 Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  judgeStep === 2
                    ? "bg-zinc-900 border-amber-500 shadow-md shadow-amber-950/40"
                    : "bg-zinc-950 border-zinc-800 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-amber-400">Step 2: patchEntity</span>
                  <span className="text-zinc-500 font-mono">30m Lock</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Lock order as Buyer to prevent front-running while paying simulated UPI.
                </p>
                <button
                  onClick={handleJudgeStep2}
                  disabled={judgeStep !== 2}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Order (Buyer)</span>
                </button>
              </div>

              {/* Step 3 Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  judgeStep === 3
                    ? "bg-zinc-900 border-blue-500 shadow-md shadow-blue-950/40"
                    : "bg-zinc-950 border-zinc-800 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-blue-400">Step 3: predictEntityKey</span>
                  <span className="text-zinc-500 font-mono">zkTLS Settle</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Compute Poseidon nullifier, predict key, and settle trade atomically.
                </p>
                <button
                  onClick={handleJudgeStep3}
                  disabled={judgeStep !== 3}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate ZK Proof & Settle</span>
                </button>
              </div>
            </div>

            {judgeStatusMsg && (
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center justify-between">
                <span>{judgeStatusMsg}</span>
                {judgeDemoOrder && (
                  <button
                    onClick={() => setInspectedEntity(judgeDemoOrder)}
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    Inspect Entity
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Orderbook Header and Maker CTA */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Active Liquidity Orderbook</h2>
            <p className="text-xs text-zinc-400">
              Queried directly from Arkiv DB-Chain nodes via <code className="text-emerald-400 font-mono">queryEntities</code>.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Order</span>
          </button>
        </div>

        {/* Main Live Orderbook */}
        <LiveOrderbook
          orders={orders}
          isLoading={isLoading}
          onRefresh={fetchOrders}
          onSelectOrderToLock={(order) => setOrderToLock(order)}
          onInspectEntity={(order) => setInspectedEntity(order)}
        />
      </main>

      {/* Modals & Drawers */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateOrder}
        makerAddress={burnerAccount?.address || ""}
      />

      <ZkSettlementModal
        isOpen={!!orderToLock}
        onClose={() => setOrderToLock(null)}
        order={orderToLock}
        takerAddress={burnerAccount?.address || ""}
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
