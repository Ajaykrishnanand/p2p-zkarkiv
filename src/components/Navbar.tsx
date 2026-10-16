"use client";

import React, { useState } from "react";
import { ShieldCheck, ExternalLink, Copy, Check, Terminal, Zap } from "lucide-react";
import { TIRAMISU_CHAIN_ID, ARKIV_EXPLORER_URL } from "@/lib/arkivClient";

interface NavbarProps {
  walletAddress: string;
  isJudgeDemoActive?: boolean;
  onToggleDemoMode?: () => void;
  onRefreshOrders?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  walletAddress,
  isJudgeDemoActive,
  onToggleDemoMode,
  onRefreshOrders,
}) => {
  const [copied, setCopied] = useState(false);

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Connecting...";

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      {/* Top Judge & Security Alert Banner */}
      <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-wide">SYNTHETIC DATA GUARD ACTIVE:</span>
            <span className="text-zinc-300 hidden sm:inline">
              Zero Real PII on Arkiv DB-Chain • Strictly enforcing <code className="text-emerald-300 font-mono">*.synth@upi</code> aliases
            </span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Tiramisu Testnet ({TIRAMISU_CHAIN_ID})
            </span>
            <a
              href="https://github.com/Ajaykrishnanand/p2p-zkarkiv"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white transition-colors underline flex items-center gap-1"
            >
              GitHub Repo
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <div className="h-full w-full bg-zinc-950 rounded-[7px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">zkUPI<span className="text-emerald-400">-Arkiv</span></span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Censorship-Resistant ZK P2P UPI Orderbook on Arkiv
            </p>
          </div>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          {onToggleDemoMode && (
            <button
              onClick={onToggleDemoMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isJudgeDemoActive
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 border border-zinc-700"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isJudgeDemoActive ? "Judge Mode Active" : "1-Click Judge Demo"}</span>
            </button>
          )}

          {/* Burner Wallet Pill */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-300">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-500 hidden md:inline">Signer:</span>
              <span className="font-mono text-zinc-200">{shortAddress}</span>
            </div>

            <button
              onClick={handleCopy}
              className="p-1 hover:text-white text-zinc-400 transition-colors"
              title="Copy Address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {walletAddress && (
              <a
                href={`${ARKIV_EXPLORER_URL}/address/${walletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:text-white text-zinc-400 transition-colors"
                title="View on Arkiv Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
