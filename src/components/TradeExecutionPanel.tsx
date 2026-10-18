"use client";

import React, { useState } from "react";
import { Plus, ShieldAlert, Sparkles, Clock, AlertTriangle, ArrowRight, Wallet } from "lucide-react";
import { isSyntheticUpi, generateSyntheticUpi } from "@/lib/syntheticGuard";

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
}

export const TradeExecutionPanel: React.FC<TradeExecutionPanelProps> = ({
  onPostOrder,
  walletAddress,
  isSubmitting,
  selectedPrice,
}) => {
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [limitPrice, setLimitPrice] = useState<number>(selectedPrice || 87.5);
  const [amountInr, setAmountInr] = useState<number>(5000);
  const [percentSlider, setPercentSlider] = useState<number>(50);
  const [syntheticAlias, setSyntheticAlias] = useState<string>("arjun.synth@okhdfc");
  const [ttlMinutes, setTtlMinutes] = useState<number>(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync selected price if clicked from orderbook
  React.useEffect(() => {
    if (selectedPrice) {
      setLimitPrice(selectedPrice);
    }
  }, [selectedPrice]);

  const usdcQuantity = (amountInr / (limitPrice || 87.5)).toFixed(2);
  const isAliasValid = isSyntheticUpi(syntheticAlias);

  const handleSliderChange = (pct: number) => {
    setPercentSlider(pct);
    // Base 10,000 INR pool
    const calculated = Math.round((10000 * (pct / 100)) / 100) * 100;
    setAmountInr(Math.max(calculated, 500));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isAliasValid) {
      setErrorMsg("Security Gate Rejection: Only synthetic UPI aliases (*.synth@*) allowed on Arkiv.");
      return;
    }

    try {
      await onPostOrder({
        amountInr,
        rateInrPerUsdc: limitPrice,
        syntheticUpiAlias: syntheticAlias,
        ttlMinutes,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit transaction to Arkiv DB-Chain.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between text-xs h-[640px]">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Header Title */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 text-sm">Trade</span>
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              createEntity
            </span>
          </div>

          {/* Buy / Sell Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTradeSide("BUY")}
              className={`py-2 rounded-lg font-bold text-xs transition-all ${
                tradeSide === "BUY"
                  ? "bg-white text-emerald-600 shadow-sm border border-emerald-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Buy USDC
            </button>
            <button
              type="button"
              onClick={() => setTradeSide("SELL")}
              className={`py-2 rounded-lg font-bold text-xs transition-all ${
                tradeSide === "SELL"
                  ? "bg-white text-rose-600 shadow-sm border border-rose-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sell USDC
            </button>
          </div>

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

          {/* Available Balance Row */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Available balance:</span>
            <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
              <span>23,946 USDC</span>
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
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">
                INR
              </span>
            </div>
          </div>

          {/* Dual Inputs: INR and USDC */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Amount (INR)
              </label>
              <input
                type="number"
                step="100"
                value={amountInr}
                onChange={(e) => setAmountInr(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                USDC Payout
              </label>
              <input
                type="text"
                readOnly
                value={usdcQuantity}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-700 cursor-not-allowed"
              />
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
              className="w-full accent-slate-900 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              {[0, 25, 50, 75, 100].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => handleSliderChange(p)}
                  className={`hover:text-slate-800 ${percentSlider === p ? "text-slate-900 font-bold" : ""}`}
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
                className="text-emerald-600 hover:underline flex items-center gap-0.5 text-[10px]"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Randomize
              </button>
            </div>
            <input
              type="text"
              value={syntheticAlias}
              onChange={(e) => setSyntheticAlias(e.target.value)}
              className={`w-full bg-slate-50 border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none ${
                isAliasValid ? "border-slate-200 focus:border-emerald-500" : "border-rose-400"
              }`}
              required
            />
            {!isAliasValid && (
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
                      ? "bg-slate-900 text-white border-slate-900 font-bold"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions & Order Breakdown */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          {errorMsg && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-600 text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Large Primary Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isAliasValid}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
              tradeSide === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <span>Submitting to Arkiv...</span>
            ) : (
              <>
                <span>{tradeSide === "BUY" ? "Buy USDC" : "Sell USDC"} / Post Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

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
              <span>Cost:</span>
              <span>₹{amountInr.toLocaleString("en-IN")} INR</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
