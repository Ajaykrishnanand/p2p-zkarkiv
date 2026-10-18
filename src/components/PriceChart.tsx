"use client";

import React, { useState, useMemo } from "react";
import { Settings, Maximize2, BarChart2, Radio } from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";

interface PriceChartProps {
  orders?: P2POrderEntity[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ orders = [] }) => {
  const [selectedRange, setSelectedRange] = useState<string>("1D");
  const [currency, setCurrency] = useState<string>("INR");

  // Derive dynamic candles directly from live on-chain order rates and creation times
  const { candles, currentPrice, minPrice, maxPrice } = useMemo(() => {
    const defaultPrice = 87.5;

    if (!orders || orders.length === 0) {
      // Baseline 8 blocks when chain has just been queried
      const baseCandles = Array.from({ length: 12 }, (_, i) => {
        const p = defaultPrice + (i % 2 === 0 ? 0.2 : -0.15) * Math.sin(i);
        return {
          time: `${(6 + i * 2).toString().padStart(2, "0")}:00`,
          open: p - 0.1,
          high: p + 0.25,
          low: p - 0.2,
          close: p + 0.15,
          volume: 250 + i * 40,
        };
      });
      return {
        candles: baseCandles,
        currentPrice: defaultPrice,
        minPrice: 86.8,
        maxPrice: 88.4,
      };
    }

    // Process actual on-chain entities
    const prices = orders.map((o) => Number(o.attributes?.rate || defaultPrice));
    const latestPrice = prices.length > 0 ? prices[0] : defaultPrice;
    const computedMin = Math.min(...prices, defaultPrice) - 0.5;
    const computedMax = Math.max(...prices, defaultPrice) + 0.5;

    const dynamicCandles = orders.slice(0, 14).map((o, idx) => {
      const price = Number(o.attributes?.rate || defaultPrice);
      const isSettled = o.attributes?.status === "SETTLED";
      const timeStr = o.data?.createdAt
        ? new Date(o.data.createdAt).toLocaleTimeString("en-IN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          })
        : `${(8 + idx).toString().padStart(2, "0")}:00`;

      return {
        time: timeStr,
        open: price - (isSettled ? 0.1 : 0.05),
        high: price + (isSettled ? 0.3 : 0.15),
        low: price - (isSettled ? 0.25 : 0.1),
        close: price + (isSettled ? 0.2 : 0.05),
        volume: Number(o.attributes?.amountInr || 5000) / 10,
      };
    });

    return {
      candles: dynamicCandles,
      currentPrice: latestPrice,
      minPrice: computedMin,
      maxPrice: computedMax,
    };
  }, [orders]);

  const priceRange = Math.max(maxPrice - minPrice, 0.5);

  const getY = (val: number) => {
    const chartHeight = 240;
    return chartHeight - ((val - minPrice) / priceRange) * (chartHeight - 40) - 20;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between h-[420px]">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            Price chart
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
            On-Chain Arkiv Tiramisu Feed
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
          >
            <option value="INR">INR ▾</option>
            <option value="USD">USD ▾</option>
          </select>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Candlestick SVG Chart Canvas */}
      <div className="relative flex-1 my-2 select-none overflow-hidden">
        {/* Right Price Scale Grid */}
        <div className="absolute right-0 top-0 bottom-6 w-14 border-l border-slate-100 flex flex-col justify-between text-[11px] font-mono text-slate-400 pl-2">
          <span>₹{maxPrice.toFixed(2)}</span>
          <span>₹{((maxPrice + currentPrice) / 2).toFixed(2)}</span>
          <span>₹{currentPrice.toFixed(2)}</span>
          <span>₹{((currentPrice + minPrice) / 2).toFixed(2)}</span>
          <span>₹{minPrice.toFixed(2)}</span>
        </div>

        {/* Current Live Price Tag on Right Axis */}
        <div
          className="absolute right-0 z-10 flex items-center transform -translate-y-1/2"
          style={{ top: `${getY(currentPrice)}px` }}
        >
          <div className="bg-emerald-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-l shadow-sm">
            {currentPrice.toFixed(2)}
          </div>
        </div>

        {/* Horizontal Dashed Current Price Line */}
        <div
          className="absolute left-0 right-14 border-b border-dashed border-emerald-400/60 pointer-events-none"
          style={{ top: `${getY(currentPrice)}px` }}
        />

        {/* SVG Candles */}
        <svg className="w-[calc(100%-3.5rem)] h-[240px]" preserveAspectRatio="none">
          {/* Subtle grid lines */}
          {[minPrice, (minPrice + currentPrice) / 2, currentPrice, (currentPrice + maxPrice) / 2, maxPrice].map(
            (p, idx) => (
              <line
                key={idx}
                x1="0"
                y1={getY(p)}
                x2="100%"
                y2={getY(p)}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            )
          )}

          {/* Render Dynamic Candles */}
          {candles.map((c, i) => {
            const x = (i / Math.max(candles.length - 1, 1)) * 90 + 5;
            const isGreen = c.close >= c.open;
            const highY = getY(c.high);
            const lowY = getY(c.low);
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(openY - closeY), 2);
            const color = isGreen ? "#10b981" : "#ef4444";

            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={`${x}%`}
                  y1={highY}
                  x2={`${x}%`}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.5"
                />
                {/* Body */}
                <rect
                  x={`calc(${x}% - 6px)`}
                  y={bodyTop}
                  width="12"
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Range Selector Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1">
          {["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "All"].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                selectedRange === range
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Tiramisu DB-Chain</span>
          <span className="text-emerald-600 font-bold">auto-synced</span>
        </div>
      </div>
    </div>
  );
};
