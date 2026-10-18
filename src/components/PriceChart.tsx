"use client";

import React, { useState } from "react";
import { Settings, Maximize2, BarChart2 } from "lucide-react";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const SAMPLE_CANDLES: Candle[] = [
  { time: "06:00", open: 86.8, high: 87.1, low: 86.5, close: 86.9, volume: 180 },
  { time: "08:00", open: 86.9, high: 87.4, low: 86.7, close: 87.2, volume: 320 },
  { time: "10:00", open: 87.2, high: 87.6, low: 87.0, close: 87.5, volume: 450 },
  { time: "12:00", open: 87.5, high: 87.8, low: 87.2, close: 87.3, volume: 290 },
  { time: "14:00", open: 87.3, high: 87.5, low: 86.9, close: 87.1, volume: 380 },
  { time: "16:00", open: 87.1, high: 87.3, low: 86.6, close: 86.8, volume: 240 },
  { time: "18:00", open: 86.8, high: 87.0, low: 86.5, close: 86.9, volume: 210 },
  { time: "20:00", open: 86.9, high: 87.5, low: 86.8, close: 87.4, volume: 410 },
  { time: "22:00", open: 87.4, high: 87.9, low: 87.3, close: 87.8, volume: 520 },
  { time: "00:00", open: 87.8, high: 88.2, low: 87.6, close: 88.0, volume: 640 },
  { time: "02:00", open: 88.0, high: 88.1, low: 87.4, close: 87.6, volume: 310 },
  { time: "04:00", open: 87.6, high: 87.9, low: 87.2, close: 87.5, volume: 280 },
  { time: "06:00", open: 87.5, high: 87.8, low: 87.3, close: 87.7, volume: 360 },
  { time: "08:00", open: 87.7, high: 88.2, low: 87.5, close: 88.1, volume: 590 },
  { time: "10:00", open: 88.1, high: 88.4, low: 87.8, close: 88.2, volume: 680 },
  { time: "12:00", open: 88.2, high: 88.3, low: 87.4, close: 87.5, volume: 420 },
];

export const PriceChart: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<string>("1D");
  const [currency, setCurrency] = useState<string>("INR");

  const minPrice = 86.0;
  const maxPrice = 88.6;
  const priceRange = maxPrice - minPrice;

  // Coordinate helper: maps price to SVG Y
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
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            USDC/INR P2P
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
          <span>₹88.50</span>
          <span>₹88.00</span>
          <span>₹87.50</span>
          <span>₹87.00</span>
          <span>₹86.50</span>
        </div>

        {/* Current Live Price Tag on Right Axis */}
        <div
          className="absolute right-0 z-10 flex items-center transform -translate-y-1/2"
          style={{ top: `${getY(87.5)}px` }}
        >
          <div className="bg-emerald-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-l shadow-sm">
            87.50
          </div>
        </div>

        {/* Horizontal Dashed Current Price Line */}
        <div
          className="absolute left-0 right-14 border-b border-dashed border-emerald-400/60 pointer-events-none"
          style={{ top: `${getY(87.5)}px` }}
        />

        {/* SVG Candles */}
        <svg className="w-[calc(100%-3.5rem)] h-[240px]" preserveAspectRatio="none">
          {/* Subtle grid lines */}
          {[86.5, 87.0, 87.5, 88.0, 88.5].map((p) => (
            <line
              key={p}
              x1="0"
              y1={getY(p)}
              x2="100%"
              y2={getY(p)}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          ))}

          {/* Render Candles */}
          {SAMPLE_CANDLES.map((c, i) => {
            const x = (i / (SAMPLE_CANDLES.length - 1)) * 90 + 5; // percentage
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

        {/* Volume histogram at bottom */}
        <div className="absolute left-0 right-14 bottom-1 h-8 flex items-end justify-between px-2 opacity-30 pointer-events-none">
          {SAMPLE_CANDLES.map((c, idx) => (
            <div
              key={idx}
              className={`w-2.5 rounded-t ${c.close >= c.open ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ height: `${(c.volume / 700) * 100}%` }}
            />
          ))}
        </div>
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
          <span>09:27:02 (UTC)</span>
          <span className="text-slate-600 font-semibold cursor-pointer">%</span>
          <span className="text-slate-600 font-semibold cursor-pointer">log</span>
          <span className="text-emerald-600 font-bold cursor-pointer">auto</span>
        </div>
      </div>
    </div>
  );
};
