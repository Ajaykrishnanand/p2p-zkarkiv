"use client";

import React, { useState } from "react";
import {
  Clock,
  ShieldCheck,
  Lock,
  ArrowRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Code2,
  AlertCircle,
  Building2,
  Coins,
} from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";

interface LiveOrderbookProps {
  orders: P2POrderEntity[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectOrderToLock: (order: P2POrderEntity) => void;
  onInspectEntity: (order: P2POrderEntity) => void;
}

const LiveOrderbookComponent: React.FC<LiveOrderbookProps> = ({
  orders,
  isLoading,
  onRefresh,
  onSelectOrderToLock,
  onInspectEntity,
}) => {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY" | "TRADES">("ACTIVE");
  const [hideOtherPairs, setHideOtherPairs] = useState<boolean>(true);

  const getOrderStatus = (order: any): string => {
    const s = order?.attributes?.status;
    if (typeof s === "object" && s !== null && "value" in s) {
      return String(s.value).toUpperCase();
    }
    return String(s || "OPEN").toUpperCase();
  };

  const getOrderAmountInr = (order: any): number => {
    const a = order?.attributes?.amountInr ?? order?.attributes?.amount_inr;
    if (typeof a === "object" && a !== null && "value" in a) {
      return Number(a.value);
    }
    return Number(a || 0);
  };

  const getOrderRate = (order: any): number => {
    const r = order?.attributes?.rate;
    if (typeof r === "object" && r !== null && "value" in r) {
      return Number(r.value);
    }
    return Number(r || 87.5);
  };

  const filteredOrders = orders.filter((order) => {
    const status = getOrderStatus(order);
    if (activeTab === "ACTIVE") return status === "OPEN" || status === "LOCKED";
    if (activeTab === "HISTORY") return status === "SETTLED";
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-xs">
      {/* Table Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`font-bold pb-2 transition-colors flex items-center gap-2 ${
              activeTab === "ACTIVE"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Active Orders</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {orders.filter((o) => getOrderStatus(o) !== "SETTLED").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`font-bold pb-2 transition-colors flex items-center gap-2 ${
              activeTab === "HISTORY"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Order History</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {orders.filter((o) => getOrderStatus(o) === "SETTLED").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("TRADES")}
            className={`font-bold pb-2 transition-colors flex items-center gap-2 ${
              activeTab === "TRADES"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Trade History</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {orders.filter((o) => getOrderStatus(o) === "SETTLED").length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={hideOtherPairs}
              onChange={(e) => setHideOtherPairs(e.target.checked)}
              className="rounded accent-slate-900"
            />
            <span>Hide other pairs</span>
          </label>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            title="Refresh Arkiv Queries"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700 text-sm">
            {activeTab === "ACTIVE"
              ? "No active orders on Arkiv DB-Chain"
              : activeTab === "HISTORY"
              ? "No settled order history yet"
              : "No executed trades yet"}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Place an order using the Trade panel on the right to post on-chain limit orders or inspect live state.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Pair</th>
                <th className="py-3 px-3">Order Type</th>
                <th className="py-3 px-3">Direction</th>
                <th className="py-3 px-3 text-right">Order Value</th>
                <th className="py-3 px-3 text-right">Order Quantity</th>
                <th className="py-3 px-3 text-right">Limit Price</th>
                <th className="py-3 px-3">Status / TTL</th>
                <th className="py-3 px-3">Payee Routing</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredOrders.map((order) => {
                const status = getOrderStatus(order);
                const amountInr = getOrderAmountInr(order);
                const rate = getOrderRate(order);
                const usdcAmount = order.data?.usdcAmount || (amountInr / (rate || 87.5)).toFixed(2);
                const isSettled = status === "SETTLED";
                const isLocked = status === "LOCKED";
                const isOpen = status === "OPEN";

                return (
                  <tr key={order.key} className="hover:bg-slate-50/70 transition-colors">
                    {/* Time */}
                    <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                      {order.data?.createdAt ? new Date(order.data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </td>

                    {/* Pair */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                          $
                        </div>
                        <span className="font-bold text-slate-800">USDC - INR</span>
                      </div>
                    </td>

                    {/* Order Type */}
                    <td className="py-3 px-3 text-slate-600 font-sans">Limit</td>

                    {/* Direction */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        BUY
                      </span>
                    </td>

                    {/* Order Value */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹{amountInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Order Quantity */}
                    <td className="py-3 px-3 text-right text-slate-700 font-semibold">
                      {usdcAmount} USDC
                    </td>

                    {/* Limit Price */}
                    <td className="py-3 px-3 text-right text-slate-600">
                      ₹{rate.toFixed(2)}
                    </td>

                    {/* Status / TTL */}
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isOpen
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isLocked
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {isLocked && <Lock className="w-3 h-3 text-amber-600" />}
                        {isSettled && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                        {status}
                      </span>
                    </td>

                    {/* Payee Routing */}
                    <td className="py-3 px-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 text-[10px]">
                        {order.data?.syntheticUpiAlias || "merchant.synth@okhdfc"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => onInspectEntity(order)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Inspect Raw Arkiv Entity"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                        </button>

                        {isOpen && (
                          <button
                            onClick={() => onSelectOrderToLock(order)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all"
                          >
                            <span>Lock & Pay</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {isLocked && (
                          <button
                            onClick={() => onSelectOrderToLock(order)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all"
                          >
                            <span>Settle ZK</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {isSettled && (
                          <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Settled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const LiveOrderbook = React.memo(LiveOrderbookComponent, (prevProps, nextProps) => {
  if (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.orders === nextProps.orders &&
    prevProps.onRefresh === nextProps.onRefresh &&
    prevProps.onSelectOrderToLock === nextProps.onSelectOrderToLock &&
    prevProps.onInspectEntity === nextProps.onInspectEntity
  ) {
    return true;
  }
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  const prev = prevProps.orders || [];
  const next = nextProps.orders || [];
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (
      prev[i].key !== next[i].key ||
      prev[i].attributes?.status !== next[i].attributes?.status ||
      prev[i].attributes?.amountInr !== next[i].attributes?.amountInr ||
      prev[i].attributes?.rate !== next[i].attributes?.rate
    ) {
      return false;
    }
  }
  return true;
});
