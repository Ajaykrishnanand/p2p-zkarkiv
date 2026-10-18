"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Layers, Clock, AlertCircle, Plus } from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";

interface OrderBookTerminalProps {
  orders: P2POrderEntity[];
  onSelectPrice?: (price: number) => void;
  onSelectOrder?: (order: P2POrderEntity) => void;
}

const OrderBookTerminalComponent: React.FC<OrderBookTerminalProps> = ({
  orders,
  onSelectPrice,
  onSelectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<"BOOK" | "TRADES">("BOOK");

  // Derive live Asks, Bids, and Recent Trades strictly from on-chain Arkiv entities
  const { asks, bids, recentTrades, midPrice, spread, bidRatio } = useMemo(() => {
    const openOrders = orders.filter((o) => o.attributes?.status !== "SETTLED");
    const settledOrders = orders.filter((o) => o.attributes?.status === "SETTLED");

    // Partition into Asks (rate >= 87.5) and Bids (rate < 87.5) or by rate distribution
    const sorted = [...openOrders].sort((a, b) => {
      const rateA = Number(a.attributes?.rate || 87);
      const rateB = Number(b.attributes?.rate || 87);
      return rateB - rateA;
    });

    const parsedAsks: Array<{
      key: string;
      price: number;
      size: number;
      total: number;
      depth: number;
      entity: P2POrderEntity;
    }> = [];

    const parsedBids: Array<{
      key: string;
      price: number;
      size: number;
      total: number;
      depth: number;
      entity: P2POrderEntity;
    }> = [];

    let maxVol = 1000;
    sorted.forEach((order) => {
      const price = Number(order.attributes?.rate || 87.5);
      const inr = Number(order.attributes?.amountInr || 5000);
      const size = Number(order.data?.usdcAmount || inr / price);
      if (inr > maxVol) maxVol = inr;

      const item = {
        key: order.key,
        price,
        size,
        total: inr,
        depth: Math.min(Math.round((inr / 20000) * 100), 95),
        entity: order,
      };

      if (price >= 87.5) {
        parsedAsks.push(item);
      } else {
        parsedBids.push(item);
      }
    });

    // Recent trades strictly from settled on-chain Arkiv entities
    const trades = settledOrders.map((s) => ({
      key: s.key,
      price: Number(s.attributes?.rate || 87.5),
      size: Number(s.data?.usdcAmount || 57.14),
      time: s.data?.settledAt
        ? new Date(s.data.settledAt).toLocaleTimeString("en-IN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "Just now",
      isBuy: true,
      raw: s,
    }));

    const calculatedMid =
      parsedAsks.length > 0 && parsedBids.length > 0
        ? (parsedAsks[parsedAsks.length - 1].price + parsedBids[0].price) / 2
        : parsedAsks.length > 0
        ? parsedAsks[parsedAsks.length - 1].price
        : parsedBids.length > 0
        ? parsedBids[0].price
        : null;

    const calculatedSpread =
      parsedAsks.length > 0 && parsedBids.length > 0
        ? Math.abs(parsedAsks[parsedAsks.length - 1].price - parsedBids[0].price)
        : null;

    const totalBids = parsedBids.reduce((acc, b) => acc + b.total, 0);
    const totalAsks = parsedAsks.reduce((acc, a) => acc + a.total, 0);
    const hasLiquidity = totalBids + totalAsks > 0;
    const ratio = hasLiquidity
      ? Math.round((totalBids / (totalBids + totalAsks)) * 100)
      : null;

    return {
      asks: parsedAsks.slice(0, 7),
      bids: parsedBids.slice(0, 7),
      recentTrades: trades,
      midPrice: calculatedMid,
      spread: calculatedSpread,
      bidRatio: ratio,
    };
  }, [orders]);

  return (
    <div className="bg-white rounded-2xl border border-[#F0E4D7] p-4 shadow-sm flex flex-col justify-between h-[560px] text-xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#F5ECE2]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("BOOK")}
            className={`font-bold pb-1 transition-colors flex items-center gap-1.5 ${
              activeTab === "BOOK"
                ? "text-[#EA3815] border-b-2 border-[#EA3815]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Order book</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeTab === "BOOK"
                ? "bg-[#FFF2EF] text-[#EA3815] font-semibold"
                : "bg-slate-100 text-slate-700"
            }`}>
              {asks.length + bids.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("TRADES")}
            className={`font-bold pb-1 transition-colors flex items-center gap-1.5 ${
              activeTab === "TRADES"
                ? "text-[#EA3815] border-b-2 border-[#EA3815]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Recent trades</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeTab === "TRADES"
                ? "bg-[#FFF2EF] text-[#EA3815] font-semibold"
                : "bg-slate-100 text-slate-700"
            }`}>
              {recentTrades.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-[#EA3815] bg-[#FFF2EF] px-1.5 py-0.5 rounded border border-[#FDCAC0] font-semibold">
            On-Chain
          </span>
        </div>
      </div>

      {activeTab === "BOOK" ? (
        <div className="flex-1 flex flex-col justify-between my-2 overflow-hidden">
          {/* Table Titles */}
          <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-400 uppercase py-1 px-1">
            <span>Price (INR)</span>
            <span className="text-right">Size (USDC)</span>
            <span className="text-right">Total (INR)</span>
          </div>

          {/* ASKS (On-Chain Sell/Ask Liquidity) */}
          <div className="space-y-0.5">
            {asks.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-slate-400 font-mono">
                No active asks on Tiramisu
              </div>
            ) : (
              asks.map((ask) => (
                <div
                  key={ask.key}
                  onClick={() => {
                    if (onSelectPrice) onSelectPrice(ask.price);
                    if (onSelectOrder) onSelectOrder(ask.entity);
                  }}
                  className="relative grid grid-cols-3 py-0.5 px-1 font-mono text-[11px] cursor-pointer hover:bg-rose-50/70 rounded transition-colors group"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-100/60 rounded-r pointer-events-none"
                    style={{ width: `${Math.max(ask.depth, 10)}%` }}
                  />
                  <span className="relative z-10 font-bold text-rose-500">
                    ₹{ask.price.toFixed(2)}
                  </span>
                  <span className="relative z-10 text-right text-slate-700">
                    {ask.size.toFixed(2)}
                  </span>
                  <span className="relative z-10 text-right text-slate-400">
                    ₹{(ask.total / 1000).toFixed(1)}k
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Dynamic Mid-Price Divider Bar */}
          <div className="my-1.5 py-1.5 px-2 bg-[#FAF6F0] border-y border-[#F0E4D7] rounded flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-800 font-mono">
                {midPrice !== null ? `₹${midPrice.toFixed(2)}` : "--"}
              </span>
              {midPrice !== null && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />}
              <span className="text-[10px] text-slate-400 font-medium">
                {midPrice !== null ? "On-Chain Mid" : "No Orders"}
              </span>
            </div>

            {/* Depth ratio bar */}
            {bidRatio !== null ? (
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <span className="text-emerald-600 font-bold">{bidRatio}%</span>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full flex overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${bidRatio}%` }} />
                  <div className="bg-rose-500 h-full" style={{ width: `${100 - bidRatio}%` }} />
                </div>
                <span className="text-rose-500 font-bold">{100 - bidRatio}%</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">Awaiting Liquidity</span>
            )}
          </div>

          {/* BIDS (On-Chain Buy/Bid Liquidity) */}
          <div className="space-y-0.5">
            {bids.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-slate-400 font-mono">
                No active bids on Tiramisu
              </div>
            ) : (
              bids.map((bid) => (
                <div
                  key={bid.key}
                  onClick={() => {
                    if (onSelectPrice) onSelectPrice(bid.price);
                    if (onSelectOrder) onSelectOrder(bid.entity);
                  }}
                  className="relative grid grid-cols-3 py-0.5 px-1 font-mono text-[11px] cursor-pointer hover:bg-emerald-50/70 rounded transition-colors group"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-100/60 rounded-r pointer-events-none"
                    style={{ width: `${Math.max(bid.depth, 10)}%` }}
                  />
                  <span className="relative z-10 font-bold text-emerald-600">
                    ₹{bid.price.toFixed(2)}
                  </span>
                  <span className="relative z-10 text-right text-slate-700">
                    {bid.size.toFixed(2)}
                  </span>
                  <span className="relative z-10 text-right text-slate-400">
                    ₹{(bid.total / 1000).toFixed(1)}k
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* RECENT TRADES TAB (From Settled Arkiv Entities) */
        <div className="flex-1 my-2 overflow-y-auto space-y-1">
          <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-400 uppercase py-1 px-1">
            <span>Price</span>
            <span className="text-right">Amount (USDC)</span>
            <span className="text-right">Settled Time</span>
          </div>

          {recentTrades.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p>No settled on-chain trades yet.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Lock an order and submit a zkTLS proof to record settlements.
              </p>
            </div>
          ) : (
            recentTrades.map((t) => (
              <div
                key={t.key}
                className="grid grid-cols-3 py-1.5 px-1 text-[11px] font-mono hover:bg-slate-50 rounded border-b border-slate-50"
              >
                <span className="text-emerald-600 font-bold">₹{t.price.toFixed(2)}</span>
                <span className="text-right text-slate-700">{t.size.toFixed(2)}</span>
                <span className="text-right text-slate-400">{t.time}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Arkiv queryEntities</span>
        <span className="text-slate-600 font-medium">Spread: {spread !== null ? `₹${spread.toFixed(2)}` : "--"}</span>
      </div>
    </div>
  );
};

export const OrderBookTerminal = React.memo(OrderBookTerminalComponent, (prevProps, nextProps) => {
  if (prevProps.orders === nextProps.orders && prevProps.onSelectPrice === nextProps.onSelectPrice && prevProps.onSelectOrder === nextProps.onSelectOrder) {
    return true;
  }
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
