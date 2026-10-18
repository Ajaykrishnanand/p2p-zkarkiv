"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Database,
  Layers,
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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/30 backdrop-blur-xs animate-fadeIn">
      <div className="relative h-full w-full max-w-xl border-l border-slate-200 bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto text-slate-800">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Arkiv Entity Inspector</h3>
                <p className="text-xs text-slate-500">Decentralized On-Chain State Viewer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 32-Byte Entity Key */}
          <div className="my-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Entity Key (32-Byte Hex)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyKey}
                  className="hover:text-slate-900 flex items-center gap-1 transition-colors text-slate-600 font-semibold text-[11px]"
                  title="Copy Entity Key"
                >
                  {copiedKey ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={`${ARKIV_EXPLORER_URL}/entity/${entity.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-800 flex items-center gap-1 transition-colors text-blue-600 font-semibold text-[11px]"
                  title="Open in Tiramisu Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Explorer</span>
                </a>
              </div>
            </div>
            <div className="font-mono text-xs text-slate-800 break-all select-all bg-white p-2 rounded-lg border border-slate-200">
              {entity.key}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 text-xs mb-4">
            {[
              { id: "ATTRIBUTES", label: "Indexed Attributes" },
              { id: "PAYLOAD", label: "Decoded Payload" },
              { id: "RAW", label: "Raw JSON" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 font-bold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Indexed Attributes */}
          {activeTab === "ATTRIBUTES" && (
            <div className="space-y-2 text-xs">
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500 font-mono">appId (str)</span>
                  <span className="font-mono font-bold text-slate-900">{entity.attributes?.appId || "zkupi-arkiv-v1"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500 font-mono">entityType (str)</span>
                  <span className="font-mono font-bold text-slate-900">{entity.attributes?.entityType || "p2p_order"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500 font-mono">status (str)</span>
                  <span className="font-mono font-bold text-emerald-700">{entity.attributes?.status || "OPEN"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500 font-mono">fiatCurrency (str)</span>
                  <span className="font-mono text-slate-800">{entity.attributes?.fiatCurrency || "INR"}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500 font-mono">amountInr (u256)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {String(entity.attributes?.amountInr ?? 0)}n
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500 font-mono">rate (u256)</span>
                  <span className="font-mono text-slate-800">{String(entity.attributes?.rate ?? 87)}n</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500 font-mono">zkVerified (bool)</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {String(entity.attributes?.zkVerified ?? false)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Decoded Payload */}
          {activeTab === "PAYLOAD" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs overflow-x-auto text-slate-200 space-y-1.5">
                <div><span className="text-slate-500">orderId:</span> "{entity.data?.orderId}"</div>
                <div><span className="text-slate-500">makerAddress:</span> "{entity.data?.makerAddress}"</div>
                <div><span className="text-slate-500">usdcAmount:</span> "{entity.data?.usdcAmount}"</div>
                <div><span className="text-slate-500">syntheticUpiAlias:</span> <span className="text-emerald-400">"{entity.data?.syntheticUpiAlias}"</span></div>
                <div><span className="text-slate-500">createdAt:</span> "{entity.data?.createdAt}"</div>
                <div><span className="text-slate-500">takerAddress:</span> {entity.data?.takerAddress ? `"${entity.data.takerAddress}"` : "null"}</div>
                <div><span className="text-slate-500">nullifierEntityKey:</span> {entity.data?.nullifierEntityKey ? `"${entity.data.nullifierEntityKey}"` : "null"}</div>
                <div>
                  <span className="text-slate-500">zkProofSummary:</span>{" "}
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
            <pre className="rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-[11px] overflow-x-auto text-slate-200 max-h-96">
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
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
