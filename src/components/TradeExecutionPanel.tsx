"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  ShieldAlert,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowRight,
  Wallet,
  X,
  RefreshCw,
  Radio,
  Wifi,
  ExternalLink,
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { isSyntheticUpi, generateSyntheticUpi } from "@/lib/syntheticGuard";
import { useArkivWebSocket } from "@/lib/useArkivWebSocket";
import { publicClient } from "@/lib/arkivClient";
import { formatEther } from "viem";

interface TradeExecutionPanelProps {
  onPostOrder: (params: {
    amountInr: number;
    rateInrPerUsdc: number;
    syntheticUpiAlias: string;
    ttlMinutes: number;
  }) => Promise<void>;
  walletAddress: string;
  isSubmitting: boolean;
  selectedPrice?: number;
  onConnectWallet?: () => void;
  onOpenEscrowModal?: () => void;
  depositedEscrowUsdc?: number;
  lockedEscrowUsdc?: number;
  grossEscrowDepositedUsdc?: number;
  onRefreshEscrow?: () => void;
  isRefreshingEscrow?: boolean;
}

export const TradeExecutionPanel: React.FC<TradeExecutionPanelProps> = ({
  onPostOrder,
  walletAddress,
  isSubmitting,
  selectedPrice,
  onConnectWallet,
  onOpenEscrowModal,
  depositedEscrowUsdc = 0,
  lockedEscrowUsdc = 0,
  grossEscrowDepositedUsdc = 0,
  onRefreshEscrow,
  isRefreshingEscrow = false,
}) => {
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [limitPrice, setLimitPrice] = useState<number>(selectedPrice || 87.5);
  const [amountInr, setAmountInr] = useState<number>(5000);
  const [percentSlider, setPercentSlider] = useState<number>(50);
  const [syntheticAlias, setSyntheticAlias] = useState<string>("");
  const [ttlMinutes, setTtlMinutes] = useState<number>(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [onChainBalance, setOnChainBalance] = useState<string | null>(null);

  // Fetch real on-chain balance from Arkiv Tiramisu DB-Chain
  useEffect(() => {
    let isMounted = true;
    async function fetchBalance() {
      if (!walletAddress) {
        setOnChainBalance(null);
        return;
      }
      try {
        const bal = await publicClient.getBalance({ address: walletAddress as `0x${string}` });
        if (isMounted) {
          setOnChainBalance(Number(formatEther(bal)).toFixed(4));
        }
      } catch (err) {
        console.warn("Failed to query on-chain balance:", err);
      }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [walletAddress]);

  // Live WebSocket stream status from Arkiv DB-Chain
  const wsStatus = useArkivWebSocket();

  // Failed Transaction State (displayed at the bottom of the order)
  const [failedTx, setFailedTx] = useState<{
    reason: string;
    code?: string;
    timestamp: string;
    sender: string;
  } | null>(null);

  // Sync selected price if clicked from orderbook
  useEffect(() => {
    if (selectedPrice) {
      setLimitPrice(selectedPrice);
    }
  }, [selectedPrice]);

  const usdcQuantity = (amountInr / (limitPrice || 87.5)).toFixed(2);
  const numUsdcQuantity = Number(usdcQuantity);
  const isAliasValid = isSyntheticUpi(syntheticAlias);
  const isSell = tradeSide === "SELL";
  const escrowAvailable = depositedEscrowUsdc ?? 0;
  const isSellBlockedNoEscrow = isSell && escrowAvailable <= 0;
  const isSellBlockedExceedsEscrow = isSell && escrowAvailable > 0 && numUsdcQuantity > escrowAvailable;

  // Dynamically synchronize default amount to deposited escrow when on SELL side
  useEffect(() => {
    if (tradeSide === "SELL") {
      if (depositedEscrowUsdc > 0) {
        setAmountInr(Number((depositedEscrowUsdc * limitPrice).toFixed(2)));
      } else {
        setAmountInr(0);
      }
    } else {
      if (amountInr <= 0 || (depositedEscrowUsdc > 0 && amountInr === Number((depositedEscrowUsdc * limitPrice).toFixed(2)))) {
        setAmountInr(5000);
      }
    }
  }, [tradeSide, depositedEscrowUsdc]);

  const handleSliderChange = (pct: number) => {
    setPercentSlider(pct);
    if (isSell) {
      if (escrowAvailable > 0) {
        // Scale according to deposited escrow balance
        const calculatedUsdc = (escrowAvailable * pct) / 100;
        const inrAmount = Number((calculatedUsdc * limitPrice).toFixed(2));
        setAmountInr(inrAmount);
      } else {
        setAmountInr(0);
      }
    } else {
      const calculated = Math.round((10000 * (pct / 100)) / 100) * 100;
      setAmountInr(Math.max(calculated, 500));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFailedTx(null);

    if (!isAliasValid) {
      setErrorMsg("Security Gate Rejection: Only synthetic UPI aliases (*.synth@*) allowed on Arkiv.");
      return;
    }

    if (isSell && isSellBlockedNoEscrow) {
      setErrorMsg("Escrow Collateral Required: You have 0 USDC deposited in escrow. Please deposit USDC into the Base Sepolia Escrow contract first.");
      if (onOpenEscrowModal) onOpenEscrowModal();
      return;
    }

    if (isSell && isSellBlockedExceedsEscrow) {
      setErrorMsg(`Order quantity (${usdcQuantity} USDC) exceeds your deposited escrow balance (${escrowAvailable.toFixed(2)} USDC). Only orders up to your deposited balance are allowed.`);
      return;
    }

    try {
      await onPostOrder({
        amountInr,
        rateInrPerUsdc: limitPrice,
        syntheticUpiAlias: syntheticAlias,
        ttlMinutes,
      });
      setFailedTx(null);

      // Notify Arkiv Webhook receiver of new order
      fetch("/api/arkiv/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-arkiv-source": "p2parkiv-ui" },
        body: JSON.stringify({
          event: "ORDER_CREATED",
          sender: walletAddress || "0xUnconnected",
          amountInr,
          rateInrPerUsdc: limitPrice,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch (err: any) {
      const reason =
        err?.shortMessage ||
        err?.message ||
        "The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account.";

      const failurePayload = {
        reason,
        code: err?.code || "ACTION_REJECTED_OR_INSUFFICIENT_GAS",
        timestamp: new Date().toLocaleTimeString(),
        sender: walletAddress || "0xUnconnected",
      };

      setFailedTx(failurePayload);

      // Dispatch Webhook for transaction failure event
      fetch("/api/arkiv/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-arkiv-source": "p2parkiv-ui" },
        body: JSON.stringify({
          event: "TRANSACTION_FAILED",
          ...failurePayload,
        }),
      }).catch(() => {});
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between text-xs h-[560px] overflow-y-auto">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Header Title */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">Trade</span>
              <span className="text-[10px] font-mono text-[#EA3815] bg-[#FEF2EF] px-2 py-0.5 rounded border border-[#FDCAC0] font-bold">
                createEntity
              </span>
            </div>
          </div>

          {/* Buy / Sell Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTradeSide("BUY");
                setFailedTx(null);
              }}
              className={`py-2 rounded-lg font-bold text-xs transition-all ${
                tradeSide === "BUY"
                  ? "bg-gradient-to-r from-[#EA3815] to-[#FF5E3A] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Buy USDC
            </button>
            <button
              type="button"
              onClick={() => {
                setTradeSide("SELL");
                setFailedTx(null);
              }}
              className={`py-2 rounded-lg font-bold text-xs transition-all ${
                tradeSide === "SELL"
                  ? "bg-gradient-to-r from-[#C2280A] to-[#EA3815] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sell USDC
            </button>
          </div>

          {/* Deposited Escrow Collateral Dashboard Card for Sellers */}
          {isSell && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/90 shadow-2xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">
                      Available Escrow Collateral
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-extrabold text-blue-950 font-mono">
                        {escrowAvailable.toFixed(2)} USDC
                      </span>
                      {onRefreshEscrow && (
                        <button
                          type="button"
                          onClick={onRefreshEscrow}
                          disabled={isRefreshingEscrow}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 cursor-pointer"
                          title="Refresh on-chain escrow balance from Base Sepolia"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshingEscrow ? "animate-spin text-blue-600" : ""}`} />
                        </button>
                      )}
                    </div>
                    {lockedEscrowUsdc > 0 && (
                      <span className="text-[10px] text-amber-700 font-semibold block leading-tight mt-0.5">
                        🔒 {lockedEscrowUsdc.toFixed(2)} USDC locked in active orders (60m TTL)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {escrowAvailable > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const maxInr = Math.round(escrowAvailable * limitPrice);
                        setAmountInr(maxInr);
                      }}
                      className="px-2 py-1 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-2xs"
                      title="Use exact available escrow balance"
                    >
                      MAX
                    </button>
                  )}
                  {onOpenEscrowModal && (
                    <button
                      type="button"
                      onClick={onOpenEscrowModal}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Deposit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status / Requirement Indicator */}
              {!walletAddress ? (
                <div className="p-2 rounded-xl bg-amber-100/70 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-1.5 leading-tight">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Connect wallet to sync your on-chain escrow.</span>
                  </span>
                  {onConnectWallet && (
                    <button
                      type="button"
                      onClick={onConnectWallet}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[10px] shrink-0 cursor-pointer"
                    >
                      Connect
                    </button>
                  )}
                </div>
              ) : isSellBlockedNoEscrow ? (
                <div className="p-2 rounded-xl bg-amber-100/70 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5 leading-tight">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {lockedEscrowUsdc > 0 ? (
                      <>
                        <strong>All escrow collateral ({lockedEscrowUsdc.toFixed(2)} USDC) is locked</strong> in active orders on Arkiv DB-Chain for their 60-min TTL. Deposit more USDC to Base Sepolia Escrow to post another sell order.
                      </>
                    ) : (
                      <>
                        <strong>0.00 USDC available in escrow:</strong> Deposit USDC to Base Sepolia Escrow before posting a sell order.
                      </>
                    )}
                  </span>
                </div>
              ) : isSellBlockedExceedsEscrow ? (
                <div className="p-2 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-900 text-[11px] flex items-start gap-1.5 leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span>Order exceeds escrow: <strong>{usdcQuantity} USDC</strong> &gt; <strong>{escrowAvailable.toFixed(2)} USDC</strong>.</span>
                    <button
                      type="button"
                      onClick={() => {
                        const maxInr = Number((escrowAvailable * limitPrice).toFixed(2));
                        setAmountInr(maxInr);
                      }}
                      className="block mt-0.5 font-bold text-rose-950 underline cursor-pointer"
                    >
                      Set to max {escrowAvailable.toFixed(2)} USDC (₹{(escrowAvailable * limitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[10px] text-emerald-700 font-medium px-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Collateral Verified on Base Sepolia</span>
                  </span>
                  <span className="font-mono">
                    Remaining: {(escrowAvailable - numUsdcQuantity).toFixed(2)} USDC
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Order Type Selector */}
          <div>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="LIMIT">Limit Order</option>
              <option value="MARKET">Market P2P Match</option>
            </select>
          </div>

          {/* Available Real On-Chain Balance Row */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Available balance:</span>
            {!walletAddress ? (
              <button
                type="button"
                onClick={onConnectWallet}
                className="text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Connect MetaMask
              </button>
            ) : (
              <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                <span>{onChainBalance !== null ? `${onChainBalance} GLM` : "Querying..."}</span>
                <a
                  href="https://hub.arkiv.network/faucet"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:underline p-0.5"
                  title="Get Faucet Tokens"
                >
                  <Plus className="w-3.5 h-3.5 rounded-full bg-slate-100 p-0.5" />
                </a>
              </div>
            )}
          </div>

          {/* Limit Price Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Limit price
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={(e) => {
                  const newPrice = Number(e.target.value) || 87.5;
                  setLimitPrice(newPrice);
                  if (numUsdcQuantity > 0) {
                    setAmountInr(Number((numUsdcQuantity * newPrice).toFixed(2)));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">
                INR
              </span>
            </div>
          </div>

          {/* Dual Inputs: INR and USDC (Both fully editable & synchronized) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isSell ? "Receive (INR)" : "Amount (INR)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={amountInr === 0 ? "" : amountInr}
                placeholder={isSell ? "0" : "875"}
                onChange={(e) => setAmountInr(Number(e.target.value) || 0)}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none ${
                  isSell ? "focus:border-rose-500" : "focus:border-emerald-500"
                }`}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  {isSell ? "USDC to Sell" : "USDC Payout"}
                </label>
                {isSell && escrowAvailable > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountInr(Number((escrowAvailable * limitPrice).toFixed(2)))}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    MAX ({escrowAvailable.toFixed(2)})
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={numUsdcQuantity === 0 ? "" : usdcQuantity}
                  placeholder={isSell ? (escrowAvailable > 0 ? escrowAvailable.toFixed(2) : "0.00") : "10.00"}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setAmountInr(Number((val * (limitPrice || 87.5)).toFixed(2)));
                  }}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-mono font-bold pr-12 bg-slate-50 border-slate-200 text-slate-900 focus:outline-none ${
                    isSell ? "focus:border-rose-500" : "focus:border-emerald-500"
                  }`}
                />
                <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">
                  USDC
                </span>
              </div>
            </div>
          </div>

          {/* Slider (0%, 25%, 50%, 75%, 100%) */}
          <div className="pt-1">
            <input
              type="range"
              min="0"
              max="100"
              step="25"
              value={percentSlider}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full accent-[#EA3815] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              {[0, 25, 50, 75, 100].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => handleSliderChange(p)}
                  className={`hover:text-slate-800 ${percentSlider === p ? "text-[#EA3815] font-bold" : ""}`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Synthetic UPI Alias with PII Guard */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span className="font-semibold text-slate-600">Synthetic Payee Alias</span>
              <button
                type="button"
                onClick={() => setSyntheticAlias(generateSyntheticUpi("merchant", "okhdfc"))}
                className="text-[#EA3815] hover:underline flex items-center gap-0.5 text-[10px] font-semibold"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Randomize
              </button>
            </div>
            <input
              type="text"
              value={syntheticAlias}
              onChange={(e) => setSyntheticAlias(e.target.value)}
              placeholder="e.g. trader.synth@okhdfc"
              className={`w-full bg-slate-50 border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none ${
                syntheticAlias.length === 0 || isAliasValid ? "border-slate-200 focus:border-[#EA3815]" : "border-rose-400"
              }`}
              required
            />
            {syntheticAlias.length > 0 && !isAliasValid && (
              <p className="text-[10px] text-rose-500 mt-0.5">
                Zero-PII Gate: Must match *.synth@bank
              </p>
            )}
          </div>

          {/* Expiration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[11px] text-slate-600 font-semibold">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Arkiv Order TTL (`ExpirationTime`)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 30, 60, 120].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setTtlMinutes(m)}
                  className={`py-1 rounded font-mono text-[10px] border transition-colors ${
                    ttlMinutes === m
                      ? "bg-[#EA3815] text-white border-[#EA3815] font-bold shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            BOTTOM ACTIONS, FAILED TX DISPLAY & WEBSOCKET STATUS
           ======================================================== */}
        {/* ========================================================
            BOTTOM ACTIONS, SUMMARY & REAL-TIME ARKIV NETWORKING
           ======================================================== */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5 mt-3">
          {errorMsg && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-600 text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Large Primary Action Button */}
          {!walletAddress ? (
            <button
              type="button"
              onClick={onConnectWallet}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 318.6 318.6" fill="none">
                <path d="M274.1 35.5l-99.5 73.9L193.3 54.8z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M44.4 35.5l98.7 74.6-18.4-55.3z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M238.3 206.8l-28.5 43.1 58.6 16.2 16.7-58.8z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M34.9 207.3l16.6 58.8 58.6-16.2-28.5-43.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M107.5 137.9l-16.1 24.3 57.2 2.6-1.9-61.7z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M211.1 137.9l-39.6-35.4-1.3 62.3 57-2.6z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M109.9 249.9l36.9-18.1-31.9-24.8z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M171.8 231.8l36.9 18.1-5-42.9z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M208.7 249.9l-36.9-18.1 3.2 24.5.4 10.5 43.9-3.9z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M106.3 262.9l43.9 3.9.4-10.5 3.2-24.5-36.9 18.1z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M149.2 189.7l-41.2-1.8-25.7 38.8 38.6-.2z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M169.4 189.7l28.3 36.8 38.6.2-25.7-38.8z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M108 226.5l-38.6.2 3.7 13.1 36.9-18.1z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M211.1 226.7l-2 4.8 36.9 18.1 3.7-13.1z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M170.2 164.8l1.3-62.3 21.8-47.7-65.7.1 21.6 47.6-1.9 61.7 11.2 32.7.7.6.7-.6z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M148.8 197.5l-11.2-32.7-57.2-2.6 17.6 34.6 10.8 1.4z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M210.6 196.8l10.8-1.4 17.6-34.6-57 2.6-11.2 32.7z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Connect MetaMask to Trade</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : isSell && isSellBlockedNoEscrow ? (
            <button
              type="button"
              onClick={onOpenEscrowModal}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-blue-600/20 active:scale-[0.99]"
            >
              <Lock className="w-4 h-4" />
              <span>
                {lockedEscrowUsdc > 0
                  ? `All Escrow Locked (${lockedEscrowUsdc.toFixed(2)} USDC) - Deposit More`
                  : "Deposit Escrow Collateral to Sell"}
              </span>
            </button>
          ) : isSell && isSellBlockedExceedsEscrow ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 rounded-xl font-bold text-xs text-white bg-rose-400 cursor-not-allowed opacity-80 flex items-center justify-center gap-2 shadow-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Exceeds Escrow ({escrowAvailable.toFixed(2)} USDC Max Allowed)</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !isAliasValid || (isSell && (isSellBlockedNoEscrow || isSellBlockedExceedsEscrow))}
              className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                tradeSide === "BUY"
                  ? "bg-gradient-to-r from-[#EA3815] to-[#FF5E3A] hover:brightness-105 shadow-[#EA3815]/25"
                  : "bg-gradient-to-r from-[#C2280A] to-[#EA3815] hover:brightness-105 shadow-[#EA3815]/25"
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Submitting to Arkiv DB-Chain...
                </span>
              ) : (
                <>
                  <span>{tradeSide === "BUY" ? "Buy USDC / Post Order" : `Sell ${usdcQuantity} USDC (Escrow Backed)`}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Transaction Summary Table */}
          <div className="space-y-1 text-[11px] font-mono text-slate-500 pt-1">
            <div className="flex justify-between">
              <span>Quantity:</span>
              <span className="font-semibold text-slate-800">{usdcQuantity} USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Arkiv gas:</span>
              <span className="text-slate-800">~0.00012 GLM</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-0.5 border-t border-slate-100">
              <span>Total Cost:</span>
              <span>₹{amountInr.toLocaleString("en-IN")} INR</span>
            </div>
          </div>

          {/* Live Arkiv WebSocket Real-Time Stream Status Bar */}
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    wsStatus.isConnected ? "bg-emerald-400" : "bg-amber-400"
                  } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    wsStatus.isConnected ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="font-bold text-slate-700">Arkiv WSS & Webhook</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500">
                {wsStatus.latestBlock ? `Block #${wsStatus.latestBlock}` : "WSS streaming..."}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  wsStatus.isConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {wsStatus.isConnected ? "WS LIVE" : "CONNECTING"}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                WEBHOOK ACTIVE
              </span>
            </div>
          </div>

          {/* ========================================================
              CRITICAL: TRANSACTION FAILED NOTIFICATION CARD (BOTTOM OF ORDER)
             ======================================================== */}
          {failedTx && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2.5 animate-fadeIn shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
                  <span>Transaction Failed on Arkiv DB-Chain</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFailedTx(null)}
                  className="text-rose-400 hover:text-rose-700 p-0.5 rounded hover:bg-rose-100 transition-colors"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Exact Error Snippet */}
              <div className="text-[10px] font-mono text-rose-800 bg-white/95 p-2 rounded-lg border border-rose-200 leading-relaxed break-words shadow-2xs">
                <div className="font-bold text-rose-900 flex items-center justify-between text-[10px] pb-1 border-b border-rose-100 mb-1">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Failure Diagnostic
                  </span>
                  <span className="text-rose-600 font-semibold truncate max-w-[140px]">{failedTx.code}</span>
                </div>
                <div className="text-rose-800 max-h-20 overflow-y-auto pr-1">
                  {failedTx.reason}
                </div>
              </div>

              {/* Network Context & Webhook notification */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] text-rose-700 font-mono gap-1">
                <span>Chain: Arkiv Tiramisu (7738577)</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Webhook dispatched to /api/arkiv/webhook
                </span>
              </div>

              {/* Action Buttons: Faucet link, Retry & Dismiss */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFailedTx(null);
                    handleSubmit(new Event("submit") as any);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry {tradeSide === "BUY" ? "Buy USDC" : "Sell"} Order</span>
                </button>

                <a
                  href="https://hub.arkiv.network/faucet"
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <span>Arkiv Faucet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setFailedTx(null)}
                  className="py-1.5 px-2.5 rounded-lg bg-rose-200/80 hover:bg-rose-300 text-rose-900 font-bold text-[11px] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
