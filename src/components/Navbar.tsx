"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Bell,
  User,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Zap,
  ArrowUpRight,
  BookOpen,
  Smartphone,
} from "lucide-react";
import { TIRAMISU_CHAIN_ID, ARKIV_EXPLORER_URL } from "@/lib/arkivClient";
import { P2POrderEntity } from "@/lib/arkivOrderbook";
import { NetworkSwitcher } from "./NetworkSwitcher";

interface NavbarProps {
  walletAddress: string;
  isJudgeDemoActive?: boolean;
  onToggleDemoMode?: () => void;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
  onOpenUpiSimulator?: () => void;
  onOpenEscrowModal?: () => void;
  onNetworkChanged?: (chainId: number) => void;
  isMetaMaskConnected?: boolean;
  orders?: P2POrderEntity[];
  wsBlock?: string | null;
  isWsConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  walletAddress,
  onConnectWallet,
  onDisconnectWallet,
  onOpenUpiSimulator,
  onOpenEscrowModal,
  onNetworkChanged,
  isMetaMaskConnected,
  orders = [],
  wsBlock,
  isWsConnected = true,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Compute live 24h stats strictly from on-chain Arkiv entities (zero fake mock data)
  const { currentPrice, high24h, low24h, volumeUsdc, turnoverInr, priceChangePct } = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        currentPrice: null,
        high24h: null,
        low24h: null,
        volumeUsdc: 0,
        turnoverInr: 0,
        priceChangePct: 0,
      };
    }

    const rates = orders
      .map((o) => Number(o.attributes?.rate))
      .filter((r) => !isNaN(r) && r > 0);
    const inrs = orders
      .map((o) => Number(o.attributes?.amountInr || 0))
      .filter((i) => !isNaN(i));
    const usdcs = orders
      .map((o) => Number(o.data?.usdcAmount || 0))
      .filter((u) => !isNaN(u));

    const totalInr = inrs.reduce((a, b) => a + b, 0);
    const totalUsdc = usdcs.reduce((a, b) => a + b, 0);
    const latestPrice = rates[0] || null;
    const oldestPrice = rates[rates.length - 1] || latestPrice;
    const change =
      latestPrice && oldestPrice && oldestPrice > 0
        ? ((latestPrice - oldestPrice) / oldestPrice) * 100
        : 0;

    return {
      currentPrice: latestPrice,
      high24h: rates.length > 0 ? Math.max(...rates) : null,
      low24h: rates.length > 0 ? Math.min(...rates) : null,
      volumeUsdc: totalUsdc,
      turnoverInr: totalInr,
      priceChangePct: change,
    };
  }, [orders]);

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Connect Wallet";

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white border-b border-slate-200">
      {/* Top Security & Zero-PII ticker alert */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-1.5 text-xs text-emerald-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-bold">ZERO REAL PII ON ARKIV:</span>
          <span className="hidden sm:inline text-emerald-700">
            Strictly synthetic aliases (<code className="font-mono font-semibold">*.synth@upi</code>) and client-side zkTLS bank session proofs.
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-emerald-700 font-mono">
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-950">
              Arkiv WSS: {wsBlock ? `Block #${wsBlock}` : "Live Streaming"}
            </span>
          </div>
          <span>Chain ID: {TIRAMISU_CHAIN_ID}</span>
          <a
            href={ARKIV_EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:underline flex items-center gap-1 font-semibold"
          >
            Tiramisu Explorer
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Pro-Exchange Ticker Header */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 w-full">
        {/* Left: Brand & Search input */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-100">
            <span className="font-extrabold text-slate-900 tracking-tight text-sm flex items-center gap-1">
              <span className="text-slate-900 font-black">Phantom</span>
              <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold tracking-wider uppercase font-mono shadow-2xs">UPI</span>
            </span>
          </div>

          <div className="relative w-40 xl:w-52 hidden lg:block shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search pair or alias..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Market Pair Badge */}
          <div className="flex items-center gap-2 border-l border-slate-100 pl-3 shrink-0">
            <button className="flex items-center gap-2 text-left hover:bg-slate-50 px-2 py-1 rounded-xl transition-colors">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                $
              </div>
              <div>
                <div className="flex items-center gap-1 font-bold text-slate-900 text-sm">
                  <span>USDC - INR</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-[10px] text-slate-400 font-medium">P2P Spot Orderbook</div>
              </div>
            </button>
          </div>

          {/* Live Price Ticker Display */}
          <div className="flex items-baseline gap-2 pl-2 shrink-0">
            <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {currentPrice !== null ? `₹${currentPrice.toFixed(2)}` : "₹--"}
            </span>
            {currentPrice !== null ? (
              <div className={`flex items-center text-xs font-bold gap-0.5 ${priceChangePct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                <ArrowUpRight className={`w-3.5 h-3.5 ${priceChangePct < 0 ? "rotate-90 text-rose-600" : ""}`} />
                <span>{priceChangePct >= 0 ? `+${priceChangePct.toFixed(2)}%` : `${priceChangePct.toFixed(2)}%`}</span>
              </div>
            ) : (
              <div className="flex items-center text-[11px] font-medium text-slate-400">
                <span>0.00%</span>
              </div>
            )}
          </div>

          {/* 24h Stats Columns (Shown on wider desktop displays) */}
          <div className="hidden 2xl:flex items-center gap-4 border-l border-slate-100 pl-3 text-xs font-mono shrink-0">
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-sans">24h high</div>
              <div className="font-bold text-slate-800">{high24h !== null ? `₹${high24h.toFixed(2)}` : "--"}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-sans">24h low</div>
              <div className="font-bold text-slate-800">{low24h !== null ? `₹${low24h.toFixed(2)}` : "--"}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-sans">24h volume</div>
              <div className="font-bold text-slate-800">{volumeUsdc > 0 ? volumeUsdc.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}</div>
            </div>
          </div>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 1-Click Network Switcher (Arkiv DB-Chain <-> Base Sepolia) */}
          <NetworkSwitcher onNetworkChanged={onNetworkChanged} />

          {/* Connect MetaMask / Connected Wallet Pill */}
          {!walletAddress ? (
            <button
              onClick={onConnectWallet}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 318.6 318.6" fill="none">
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
              <span>Connect MetaMask</span>
            </button>
          ) : (
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500 text-[11px] font-semibold">MetaMask:</span>
                <span className="font-mono text-slate-800 font-semibold">{shortAddress}</span>
              </div>

              <button
                onClick={handleCopy}
                className="p-1 hover:text-slate-900 text-slate-400 rounded transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {onDisconnectWallet && (
                <button
                  onClick={onDisconnectWallet}
                  className="ml-1 px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Disconnect MetaMask"
                >
                  Disconnect
                </button>
              )}
            </div>
          )}

          {/* Base Sepolia Escrow Deposit Button */}
          {onOpenEscrowModal && (
            <button
              onClick={onOpenEscrowModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Deposit USDC to Base Sepolia Escrow Contract"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="hidden sm:inline">Base Escrow</span>
              <span className="sm:hidden">Escrow</span>
            </button>
          )}

          {/* Interactive UPI Mobile Simulator Trigger Button */}
          {onOpenUpiSimulator && (
            <button
              onClick={onOpenUpiSimulator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Open Interactive UPI Mobile Simulator with zkTLS Prover"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">UPI Simulator (zkTLS)</span>
              <span className="sm:hidden">Simulator</span>
            </button>
          )}

          {/* How to Use Guide Link */}
          <a
            href="https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/HOW_TO_USE.md"
            target="_blank"
            rel="noreferrer"
            className="hidden xl:flex px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs items-center gap-1.5 border border-emerald-200 transition-all shadow-2xs"
            title="Read the Public How to Use Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>How to Use</span>
            <ExternalLink className="w-3 h-3 text-emerald-500" />
          </a>

          {/* Faucet Link Pill */}
          <a
            href="https://hub.arkiv.network/faucet"
            target="_blank"
            rel="noreferrer"
            className="hidden 2xl:flex px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs items-center gap-1.5 shadow-sm transition-all"
          >
            <span>Get Test GLM</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Notification Bell */}
          <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          {/* Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
