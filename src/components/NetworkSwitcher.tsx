"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ExternalLink,
  Check,
  RefreshCw,
  Globe,
  Layers,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  NETWORKS,
  getCurrentChainId,
  switchNetwork,
  NetworkConfig,
} from "@/lib/networkSwitcher";
import { TIRAMISU_CHAIN_ID } from "@/lib/arkivClient";
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/baseEscrowClient";

interface NetworkSwitcherProps {
  onNetworkChanged?: (chainId: number) => void;
}

export const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ onNetworkChanged }) => {
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync chain on mount and listen to MetaMask chainChanged event
  useEffect(() => {
    let isMounted = true;

    async function syncChain() {
      const chainId = await getCurrentChainId();
      if (isMounted) {
        setCurrentChainId(chainId);
        if (chainId && onNetworkChanged) onNetworkChanged(chainId);
      }
    }

    syncChain();

    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleChainChanged = (hexChain: string) => {
        const id = parseInt(hexChain, 16);
        setCurrentChainId(id);
        if (onNetworkChanged) onNetworkChanged(id);
      };

      (window as any).ethereum.on("chainChanged", handleChainChanged);
      return () => {
        isMounted = false;
        try {
          (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
        } catch {}
      };
    }
  }, [onNetworkChanged]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (targetChainId: number) => {
    if (targetChainId === currentChainId) {
      setIsOpen(false);
      return;
    }
    setIsSwitching(true);
    setSwitchError(null);
    try {
      await switchNetwork(targetChainId);
      setCurrentChainId(targetChainId);
      if (onNetworkChanged) onNetworkChanged(targetChainId);
      setIsOpen(false);
    } catch (err: any) {
      console.warn("Failed to switch network:", err);
      setSwitchError(err?.message || "User rejected chain switch");
    } finally {
      setIsSwitching(false);
    }
  };

  const activeNetwork: NetworkConfig | undefined = currentChainId
    ? NETWORKS[currentChainId]
    : undefined;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Network Pill Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer select-none ${
          currentChainId === TIRAMISU_CHAIN_ID
            ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900"
            : currentChainId === BASE_SEPOLIA_CHAIN_ID
            ? "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900"
            : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
        }`}
        title="Switch between Arkiv DB-Chain and Base Sepolia"
      >
        {isSwitching ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
        ) : currentChainId === TIRAMISU_CHAIN_ID ? (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        ) : currentChainId === BASE_SEPOLIA_CHAIN_ID ? (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
          </span>
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-400" />
        )}

        <span>
          {activeNetwork ? activeNetwork.shortName : "Switch Network"}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform text-slate-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-[#F0E4D7] shadow-xl z-50 p-2 animate-fadeIn text-xs">
          <div className="px-3 py-2 border-b border-[#F5ECE2] flex items-center justify-between">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Select Active Network
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              EIP-1193 RPC
            </span>
          </div>

          <div className="py-1 space-y-1">
            {/* Arkiv Tiramisu Option */}
            <button
              type="button"
              onClick={() => handleSwitch(TIRAMISU_CHAIN_ID)}
              className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-start justify-between gap-2.5 ${
                currentChainId === TIRAMISU_CHAIN_ID
                  ? "bg-emerald-50/80 border border-emerald-200"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                  Ark
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <span>Arkiv Tiramisu</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      7738577
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Orderbook Entities, Indexing & zkTLS Proofs
                  </div>
                </div>
              </div>
              {currentChainId === TIRAMISU_CHAIN_ID && (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
              )}
            </button>

            {/* Base Sepolia Option */}
            <button
              type="button"
              onClick={() => handleSwitch(BASE_SEPOLIA_CHAIN_ID)}
              className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-start justify-between gap-2.5 ${
                currentChainId === BASE_SEPOLIA_CHAIN_ID
                  ? "bg-blue-50/80 border border-blue-200"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                  Base
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <span>Base Sepolia</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                      84532
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    USDC Escrow Contract & Atomic Fund Settlement
                  </div>
                </div>
              </div>
              {currentChainId === BASE_SEPOLIA_CHAIN_ID && (
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
              )}
            </button>
          </div>

          {switchError && (
            <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{switchError}</span>
            </div>
          )}

          <div className="pt-2 mt-1 border-t border-slate-100 px-3 py-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Powered by Arkiv & Base</span>
            <div className="flex items-center gap-2">
              <a
                href={NETWORKS[TIRAMISU_CHAIN_ID].explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-700 flex items-center gap-0.5"
              >
                Arkiv Explorer
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span>•</span>
              <a
                href={NETWORKS[BASE_SEPOLIA_CHAIN_ID].explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-700 flex items-center gap-0.5"
              >
                Basescan
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
