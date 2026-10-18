"use client";

import React, { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Layers, Clock } from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";

interface OrderBookTerminalProps {
  orders: P2POrderEntity[];
  onSelectPrice?: (price: number) => void;
  onSelectOrder?: (order: P2POrderEntity) => void;
}

export const OrderBookTerminal: React.FC<OrderBookTerminalProps> = ({
  orders,
  onSelectPrice,
  onSelectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<"BOOK" | "TRADES">("BOOK");

  // Simulated & Real orderbook depth
  const asks = [
    { price: 88.45, size: 1450.0, total: 128252.5, depth: 85 },
    { price: 88.20, size: 820.5, total: 72368.1, depth: 65 },
    { price: 88.05, size: 2100.0, total: 184905.0, depth: 90 },
    { price: 87.90, size: 540.2, total: 47483.5, depth: 40 },
    { price: 87.75, size: 950.0, total: 83362.5, depth: 55 },
    { price: 87.60, size: 1120.8, total: 98182.0, depth: 70 },
  ];

  const bids = [
    { price: 87.45, size: 1250.0, total: 109312.5, depth: 60 },
    { price: 87.30, size: 980.4, total: 85588.9, depth: 45 },
    { price: 87.15, size: 3100.0, total: 270165.0, depth: 95 },
    { price: 87.00, size: 1640.0, total: 142680.0, depth: 75 },
    { price: 86.85, size: 890.0, total: 77296.5, depth: 50 },
    { price: 86.70, size: 2200.5, total: 190783.3, depth: 80 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between h-[420px] text-xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("BOOK")}
            className={`font-bold pb-1 transition-colors ${
              activeTab === "BOOK"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Order book
          </button>
          <button
            onClick={() => setActiveTab("TRADES")}
            className={`font-bold pb-1 transition-colors ${
              activeTab === "TRADES"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Recent trades
          </button>
        </div>

        {/* View Mode icons */}
        <div className="flex items-center gap-1 text-slate-400">
          <button className="p-1 rounded hover:bg-slate-50 text-emerald-600" title="Both Asks and Bids">
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeTab === "BOOK" ? (
        <div className="flex-1 flex flex-col justify-between my-2 overflow-hidden">
          {/* Table Column Titles */}
          <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-400 uppercase py-1 px-1">
            <span>Price (INR)</span>
            <span className="text-right">Size (USDC)</span>
            <span className="text-right">Total (INR)</span>
          </div>

          {/* ASKS (Sell Orders - Red) */}
          <div className="space-y-0.5">
            {asks.slice(0, 5).map((ask, idx) => (
              <div
                key={idx}
                onClick={() => onSelectPrice && onSelectPrice(ask.price)}
                className="relative grid grid-cols-3 py-0.5 px-1 font-mono text-[11px] cursor-pointer hover:bg-rose-50/60 rounded transition-colors group"
              >
                {/* Depth bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-100/60 rounded-r pointer-events-none"
                  style={{ width: `${ask.depth}%` }}
                />
                <span className="relative z-10 font-bold text-rose-500">
                  {ask.price.toFixed(2)}
                </span>
                <span className="relative z-10 text-right text-slate-700">
                  {ask.size.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </span>
                <span className="relative z-10 text-right text-slate-400">
                  ₹{(ask.total / 1000).toFixed(1)}k
                </span>
              </div>
            ))}
          </div>

          {/* Current Mid-Price Divider Bar */}
          <div className="my-1.5 py-1.5 px-2 bg-slate-50 border-y border-slate-100 rounded flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-emerald-600 font-mono">
                ₹87.50
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] text-slate-500 font-medium">=$1.00 USDC</span>
            </div>

            {/* Depth ratio bar */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-emerald-600 font-bold">48.2%</span>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full flex overflow-hidden">
                <div className="bg-emerald-500 h-full w-[48%]" />
                <div className="bg-rose-500 h-full w-[52%]" />
              </div>
              <span className="text-rose-500 font-bold">51.8%</span>
            </div>
          </div>

          {/* BIDS (Buy Orders - Green) */}
          <div className="space-y-0.5">
            {bids.slice(0, 5).map((bid, idx) => (
              <div
                key={idx}
                onClick={() => onSelectPrice && onSelectPrice(bid.price)}
                className="relative grid grid-cols-3 py-0.5 px-1 font-mono text-[11px] cursor-pointer hover:bg-emerald-50/60 rounded transition-colors group"
              >
                {/* Depth bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-100/60 rounded-r pointer-events-none"
                  style={{ width: `${bid.depth}%` }}
                />
                <span className="relative z-10 font-bold text-emerald-600">
                  {bid.price.toFixed(2)}
                </span>
                <span className="relative z-10 text-right text-slate-700">
                  {bid.size.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </span>
                <span className="relative z-10 text-right text-slate-400">
                  ₹{(bid.total / 1000).toFixed(1)}k
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* RECENT TRADES TAB */
        <div className="flex-1 my-2 overflow-y-auto space-y-1">
          <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-400 uppercase py-1 px-1">
            <span>Price</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Time</span>
          </div>

          {[
            { price: 87.50, size: 57.47, time: "13:04:12", isBuy: true },
            { price: 87.50, size: 120.0, time: "13:03:55", isBuy: true },
            { price: 87.48, size: 85.0, time: "13:02:40", isBuy: false },
            { price: 87.52, size: 210.0, time: "13:01:18", isBuy: true },
            { price: 87.45, size: 500.0, time: "12:59:02", isBuy: false },
            { price: 87.50, size: 75.0, time: "12:58:33", isBuy: true },
          ].map((t, idx) => (
            <div key={idx} className="grid grid-cols-3 py-1 px-1 text-[11px] font-mono hover:bg-slate-50 rounded">
              <span className={t.isBuy ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                ₹{t.price.toFixed(2)}
              </span>
              <span className="text-right text-slate-700">{t.size.toFixed(2)}</span>
              <span className="text-right text-slate-400">{t.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer spread info */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Arkiv DB-Chain Orderbook</span>
        <span className="text-emerald-600 font-medium">Spread: ₹0.15 (0.17%)</span>
      </div>
    </div>
  );
};
