"use client";

import React, { useState } from "react";
import { X, ShieldAlert, Sparkles, Clock, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { isSyntheticUpi, generateSyntheticUpi } from "@/lib/syntheticGuard";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    amountInr: number;
    rateInrPerUsdc: number;
    syntheticUpiAlias: string;
    ttlMinutes: number;
  }) => Promise<void>;
  makerAddress: string;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  makerAddress,
}) => {
  const [amountInr, setAmountInr] = useState<number>(5000);
  const [rateInr, setRateInr] = useState<number>(87);
  const [syntheticAlias, setSyntheticAlias] = useState<string>("arjun.synth@okhdfc");
  const [ttlMinutes, setTtlMinutes] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const usdcEquivalent = (amountInr / (rateInr || 87)).toFixed(2);
  const isAliasValid = isSyntheticUpi(syntheticAlias);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isAliasValid) {
      setErrorMsg("Security Gate Rejection: Only synthetic aliases (*.synth@*) are allowed on Arkiv.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        amountInr,
        rateInrPerUsdc: rateInr,
        syntheticUpiAlias: syntheticAlias,
        ttlMinutes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create order on Arkiv DB-Chain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutofillSynthetic = () => {
    setSyntheticAlias(generateSyntheticUpi("merchant", "okhdfc"));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-emerald-950/20">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Post P2P Liquidity Order</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                createEntity
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Writes indexed order attributes and auto-expiring TTL to Arkiv DB-Chain.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Amount and Rate row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Order Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₹</span>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={amountInr}
                  onChange={(e) => setAmountInr(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {[1000, 5000, 10000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setAmountInr(preset)}
                    className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800"
                  >
                    ₹{preset / 1000}k
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Rate (INR per USDC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₹</span>
                <input
                  type="number"
                  min={80}
                  max={120}
                  step={0.5}
                  value={rateInr}
                  onChange={(e) => setRateInr(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-emerald-400 font-medium mt-1.5">
                Yields: <span className="font-mono">{usdcEquivalent} USDC</span>
              </p>
            </div>
          </div>

          {/* Synthetic UPI Alias with PII Guard */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                <span>Synthetic Payee Alias</span>
                <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20 font-mono">
                  *.synth@upi only
                </span>
              </label>
              <button
                type="button"
                onClick={handleAutofillSynthetic}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline"
              >
                <Sparkles className="w-3 h-3" />
                Randomize Synthetic
              </button>
            </div>

            <input
              type="text"
              value={syntheticAlias}
              onChange={(e) => setSyntheticAlias(e.target.value)}
              placeholder="e.g. rahul.synth@okaxis"
              className={`w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none ${
                isAliasValid
                  ? "border-emerald-500/50 focus:border-emerald-400"
                  : "border-rose-500/50 focus:border-rose-400"
              }`}
              required
            />

            {!isAliasValid && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Zero-PII Gate: Must match *.synth@bank (real phone/UPI forbidden)
              </p>
            )}
          </div>

          {/* TTL Selector (ExpirationTime) */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Arkiv Expiration Time (`ExpirationTime`)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "15 Mins", value: 15 },
                { label: "30 Mins", value: 30 },
                { label: "60 Mins", value: 60 },
                { label: "120 Mins", value: 120 },
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setTtlMinutes(item.value)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    ttlMinutes === item.value
                      ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Arkiv automatically prunes this entity from the chain once expired.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isAliasValid}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <span>Writing to Arkiv DB-Chain...</span>
              ) : (
                <>
                  <span>Create Order on Arkiv</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
