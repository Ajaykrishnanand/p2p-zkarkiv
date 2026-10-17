"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Code2,
  Database,
  Clock,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";
import { ARKIV_EXPLORER_URL } from "@/lib/arkivClient";

interface ExplorerInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  entity: P2POrderEntity | null;
}

export const ExplorerInspector: React.FC<ExplorerInspectorProps> = ({
  isOpen,
  onClose,
  entity,
}) => {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ATTRIBUTES" | "PAYLOAD" | "RAW">("ATTRIBUTES");

  if (!isOpen || !entity) return null;

  const handleCopyKey = () => {
    if (!entity.key) return;
    navigator.clipboard.writeText(entity.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative h-full w-full max-w-xl border-l border-zinc-800 bg-zinc-950 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Arkiv Entity Inspector</h3>
                <p className="text-xs text-zinc-400">Decentralized On-Chain State Viewer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 32-Byte Entity Key */}
          <div className="my-5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1 font-medium">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Entity Key (32-Byte Hex)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyKey}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                  title="Copy Entity Key"
                >
                  {copiedKey ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[11px]">{copiedKey ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={`${ARKIV_EXPLORER_URL}/entity/${entity.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white flex items-center gap-1 transition-colors text-emerald-400"
                  title="Open in Tiramisu Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Explorer</span>
                </a>
              </div>
            </div>
            <div className="font-mono text-xs text-zinc-200 break-all select-all bg-zinc-950 p-2 rounded border border-zinc-800/80">
              {entity.key}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800 text-xs mb-4">
            {[
              { id: "ATTRIBUTES", label: "Indexed Attributes" },
              { id: "PAYLOAD", label: "Decoded Payload" },
              { id: "RAW", label: "Raw JSON" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Indexed Attributes */}
          {activeTab === "ATTRIBUTES" && (
            <div className="space-y-2 text-xs">
              <div className="text-[11px] text-zinc-500 mb-2">
                Attributes are indexed on-chain by Arkiv nodes, enabling high-performance queries without centralized databases:
              </div>

              <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800 bg-zinc-900/60">
                <div className="p-3 flex justify-between">
                  <span className="text-zinc-400 font-mono">appId (str)</span>
                  <span className="font-mono text-emerald-300">{entity.attributes?.appId || "zkupi-arkiv-v1"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-zinc-400 font-mono">entityType (str)</span>
                  <span className="font-mono text-white">{entity.attributes?.entityType || "p2p_order"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-zinc-400 font-mono">status (str)</span>
                  <span className="font-mono text-cyan-300 font-bold">{entity.attributes?.status || "OPEN"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-zinc-400 font-mono">fiatCurrency (str)</span>
                  <span className="font-mono text-zinc-300">{entity.attributes?.fiatCurrency || "INR"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-zinc-400 font-mono">amountInr (u256)</span>
                  <span className="font-mono text-white font-semibold">
                    {String(entity.attributes?.amountInr ?? 0)}n
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-zinc-400 font-mono">rate (u256)</span>
                  <span className="font-mono text-zinc-300">{String(entity.attributes?.rate ?? 87)}n</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-zinc-400 font-mono">zkVerified (bool)</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {String(entity.attributes?.zkVerified ?? false)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Decoded Payload */}
          {activeTab === "PAYLOAD" && (
            <div className="space-y-3 text-xs">
              <div className="text-[11px] text-zinc-500">
                Decoded via <code className="text-emerald-400 font-mono">payloadToJson(entity.payload)</code>:
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs overflow-x-auto text-zinc-300 space-y-1.5">
                <div><span className="text-zinc-500">orderId:</span> "{entity.data?.orderId}"</div>
                <div><span className="text-zinc-500">makerAddress:</span> "{entity.data?.makerAddress}"</div>
                <div><span className="text-zinc-500">usdcAmount:</span> "{entity.data?.usdcAmount}"</div>
                <div><span className="text-zinc-500">syntheticUpiAlias:</span> <span className="text-emerald-400">"{entity.data?.syntheticUpiAlias}"</span></div>
                <div><span className="text-zinc-500">createdAt:</span> "{entity.data?.createdAt}"</div>
                <div><span className="text-zinc-500">takerAddress:</span> {entity.data?.takerAddress ? `"${entity.data.takerAddress}"` : "null"}</div>
                <div><span className="text-zinc-500">nullifierEntityKey:</span> {entity.data?.nullifierEntityKey ? `"${entity.data.nullifierEntityKey}"` : "null"}</div>
                <div>
                  <span className="text-zinc-500">zkProofSummary:</span>{" "}
                  {entity.data?.zkProofSummary ? (
                    <pre className="text-cyan-300 pl-4 mt-1 text-[11px]">
                      {JSON.stringify(entity.data.zkProofSummary, null, 2)}
                    </pre>
                  ) : (
                    "null"
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Raw JSON */}
          {activeTab === "RAW" && (
            <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] overflow-x-auto text-zinc-300 max-h-96">
              {JSON.stringify(
                {
                  key: entity.key,
                  attributes: entity.attributes,
                  payload: entity.data,
                },
                (_, v) => (typeof v === "bigint" ? v.toString() + "n" : v),
                2
              )}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
