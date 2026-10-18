"use client";

import React, { useState } from "react";
import {
  Clock,
  ShieldCheck,
  Lock,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Code2,
  AlertCircle,
  Building2,
  Sparkles,
} from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";

interface LiveOrderbookProps {
  orders: P2POrderEntity[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectOrderToLock: (order: P2POrderEntity) => void;
  onInspectEntity: (order: P2POrderEntity) => void;
}

export const LiveOrderbook: React.FC<LiveOrderbookProps> = ({
  orders,
  isLoading,
  onRefresh,
  onSelectOrderToLock,
  onInspectEntity,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [maxRateFilter, setMaxRateFilter] = useState<number>(100);

  const filteredOrders = orders.filter((order) => {
    const status = String(order.attributes?.status || "OPEN").toUpperCase();
    if (filterStatus !== "ALL" && status !== filterStatus) return false;
    const rateNum = Number(order.attributes?.rate || 87);
    if (rateNum > maxRateFilter) return false;
    return true;
  });

  const getBankBadge = (alias: string) => {
    const handle = (alias || "").split("@")[1] || "upi";
    return handle.toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Filters and Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-base">Live P2P Liquidity Book</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
            </span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status buttons */}
          <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800 text-xs">
            {["ALL", "OPEN", "LOCKED", "SETTLED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Rate selector */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span>Rate ≤ ₹{maxRateFilter}</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh Arkiv Queries"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
          <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <h4 className="text-zinc-300 font-medium text-sm">No Active Liquidity Matches Filter</h4>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto mt-1">
            Create a new liquidity order above or click "1-Click Judge Demo" to instantly populate live testnet entities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const status = String(order.attributes?.status || "OPEN").toUpperCase();
            const amountInr = Number(order.attributes?.amountInr || 0);
            const rate = Number(order.attributes?.rate || 87);
            const usdcAmount = order.data?.usdcAmount || (amountInr / (rate || 87)).toFixed(2);
            const isSettled = status === "SETTLED";
            const isLocked = status === "LOCKED";
            const isOpen = status === "OPEN";
            const bankHandle = getBankBadge(order.data?.syntheticUpiAlias);

            return (
              <div
                key={order.key}
                className="group relative rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all p-5 flex flex-col justify-between hover:border-zinc-700 shadow-sm"
              >
                <div>
                  {/* Top order status & rate */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        isOpen
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : isLocked
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                      {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                      {isSettled && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                      {status}
                    </span>

                    <span className="text-xs font-mono font-medium text-zinc-400">
                      Rate: <span className="text-zinc-200">₹{rate} / USDC</span>
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="mb-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white tracking-tight">
                          ₹{amountInr.toLocaleString("en-IN")}
                        </div>
                        <div className="text-xs text-zinc-400">Fiat Order Value (INR)</div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold text-emerald-400">
                          {usdcAmount} USDC
                        </div>
                        <div className="text-[11px] text-zinc-500">Escrow Payout</div>
                      </div>
                    </div>
                  </div>

                  {/* Synthetic Alias & TTL */}
                  <div className="space-y-1.5 border-t border-zinc-800/80 pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-zinc-500" />
                        Routing ({bankHandle}):
                      </span>
                      <span className="font-mono text-zinc-300 text-[11px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        {order.data?.syntheticUpiAlias || "demo.synth@okhdfc"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        Expires In:
                      </span>
                      <span className="font-mono text-zinc-300">
                        {isSettled ? "7 Days (Settled)" : isLocked ? "30 Mins (Payment Lock)" : "60 Mins"}
                      </span>
                    </div>

                    {order.attributes?.zkVerified && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium pt-1">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          zkTLS Groth16 Verified
                        </span>
                        <span className="text-zinc-500 font-mono">Nullifier Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onInspectEntity(order)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                    title="Inspect Raw Arkiv Entity Key and Payload"
                  >
                    <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Raw Entity</span>
                  </button>

                  {isOpen && (
                    <button
                      onClick={() => onSelectOrderToLock(order)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <span>Lock & Pay UPI</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isLocked && (
                    <button
                      onClick={() => onSelectOrderToLock(order)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <span>Settle with ZK Proof</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isSettled && (
                    <button
                      onClick={() => onInspectEntity(order)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium cursor-default"
                    >
                      Trade Settled
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
