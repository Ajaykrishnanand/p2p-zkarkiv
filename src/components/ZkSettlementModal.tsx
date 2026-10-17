"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Fingerprint,
  FileCheck,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";
import {
  simulateBankTlsSession,
  generateZkTlsProof,
  BankTlsSession,
  ZkProofBundle,
} from "@/lib/zkTlsProver";
import { generateSyntheticUtr } from "@/lib/syntheticGuard";

interface ZkSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: P2POrderEntity | null;
  takerAddress: string;
  onLockOrder: (order: P2POrderEntity) => Promise<void>;
  onSettleOrder: (order: P2POrderEntity, zkBundle: ZkProofBundle) => Promise<void>;
}

export const ZkSettlementModal: React.FC<ZkSettlementModalProps> = ({
  isOpen,
  onClose,
  order,
  takerAddress,
  onLockOrder,
  onSettleOrder,
}) => {
  const [step, setStep] = useState<"LOCK" | "NOTARIZE" | "PROVE" | "SETTLE_SUCCESS">("LOCK");
  const [tlsSession, setTlsSession] = useState<BankTlsSession | null>(null);
  const [zkBundle, setZkBundle] = useState<ZkProofBundle | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const isAlreadyLocked = order.attributes?.status === "LOCKED";
  const amountInr = Number(order.attributes?.amountInr || 5000);
  const payeeAlias = order.data?.syntheticUpiAlias || "merchant01.synth@okhdfc";

  // 1. Lock Order
  const handleLockOrder = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      await onLockOrder(order);
      // Automatically prepare the simulated bank TLS session
      const session = simulateBankTlsSession({
        amountInr,
        recipientAlias: payeeAlias,
        syntheticUtr: generateSyntheticUtr(),
      });
      setTlsSession(session);
      setStep("NOTARIZE");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to lock order on Arkiv.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Generate zkTLS & Groth16 Proof
  const handleGenerateProof = async () => {
    if (!tlsSession) {
      const session = simulateBankTlsSession({
        amountInr,
        recipientAlias: payeeAlias,
        syntheticUtr: generateSyntheticUtr(),
      });
      setTlsSession(session);
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const proof = await generateZkTlsProof(tlsSession!);
      setZkBundle(proof);
      setStep("PROVE");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to generate zkTLS Groth16 proof.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Submit Settlement to Arkiv DB-Chain
  const handleSettleOnArkiv = async () => {
    if (!zkBundle) return;
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      await onSettleOrder(order, zkBundle);
      setStep("SETTLE_SUCCESS");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to settle order on Arkiv DB-Chain.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-emerald-950/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">Zero-Knowledge Settlement Flow</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                zkTLS + Poseidon Nullifier
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Order #{order.data?.orderId || "ORD"} • ₹{amountInr.toLocaleString("en-IN")} INR ({order.data?.usdcAmount} USDC)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Step Bar */}
        <div className="grid grid-cols-3 gap-2 my-5 text-xs font-medium">
          <div
            className={`p-2.5 rounded-lg border text-center transition-all ${
              step === "LOCK" && !isAlreadyLocked
                ? "bg-zinc-900 border-emerald-500/60 text-emerald-400 shadow-sm"
                : "bg-zinc-950 border-zinc-800 text-zinc-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>1. Lock Order</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">patchEntity (30m)</span>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-center transition-all ${
              step === "NOTARIZE" || (isAlreadyLocked && step === "LOCK")
                ? "bg-zinc-900 border-emerald-500/60 text-emerald-400 shadow-sm"
                : "bg-zinc-950 border-zinc-800 text-zinc-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              <span>2. zkTLS Notarize</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Redact Balances</span>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-center transition-all ${
              step === "PROVE" || step === "SETTLE_SUCCESS"
                ? "bg-zinc-900 border-emerald-500/60 text-emerald-400 shadow-sm"
                : "bg-zinc-950 border-zinc-800 text-zinc-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 font-semibold">
              <Fingerprint className="w-3.5 h-3.5" />
              <span>3. Settle on Arkiv</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">predictEntityKey</span>
          </div>
        </div>

        {/* Step 1: Lock Order */}
        {step === "LOCK" && !isAlreadyLocked && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-sm text-zinc-300">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Payee Synthetic UPI:</span>
                <span className="font-mono text-zinc-200">{payeeAlias}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Amount Due:</span>
                <span className="font-semibold text-white">₹{amountInr.toLocaleString("en-IN")} INR</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">USDC Released to Taker:</span>
                <span className="font-mono text-emerald-400">{order.data?.usdcAmount} USDC</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Clicking below calls <code className="text-emerald-400 font-mono">patchEntity</code> on Arkiv, setting status to <code className="text-amber-400 font-mono">LOCKED</code> with a 30-minute lock window so other buyers cannot claim this quote.
            </p>

            <button
              onClick={handleLockOrder}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 disabled:opacity-50 transition-all"
            >
              {isProcessing ? "Locking on Arkiv..." : "Lock Order as Buyer"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Notarize / Simulated Bank TLS Session */}
        {(step === "NOTARIZE" || (isAlreadyLocked && step === "LOCK")) && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Simulated Bank HTTPS TLS 1.3 Notarization
                </span>
                <span className="font-mono text-zinc-500 text-[11px]">HDFC / NPCI API</span>
              </div>

              {/* Redacted JSON view */}
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1">
                <div className="text-zinc-500">// HTTPS TLS 1.3 Response (Client Ephemeral Memory Only)</div>
                <div>{"{"}</div>
                <div className="pl-4">
                  <span className="text-zinc-500">"status":</span> <span className="text-emerald-400">"SUCCESS"</span>,
                </div>
                <div className="pl-4">
                  <span className="text-zinc-500">"amount":</span> <span className="text-white">{amountInr}</span>,
                </div>
                <div className="pl-4">
                  <span className="text-zinc-500">"payeeVpa":</span> <span className="text-zinc-300">"{payeeAlias}"</span>,
                </div>
                <div className="pl-4">
                  <span className="text-zinc-500">"utr":</span> <span className="text-cyan-400">"{tlsSession?.redactedResponseBody.utr || "SYNTH-UTR-918230192830"}"</span>,
                </div>
                <div className="pl-4 text-emerald-400/80">
                  <span className="text-zinc-500">"payerAccount":</span> "REDACTED_BY_ZKTLS",
                </div>
                <div className="pl-4 text-emerald-400/80">
                  <span className="text-zinc-500">"accountBalance":</span> "REDACTED_BY_ZKTLS"
                </div>
                <div>{"}"}</div>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Zero-Screenshot Guarantee: Neither the raw bank HTML, nor your account balance, nor your real bank statement touches Arkiv. A client-side Groth16 proof will verify the cryptographic commitment off-chain.
            </p>

            <button
              onClick={handleGenerateProof}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50 transition-all"
            >
              {isProcessing ? "Generating Groth16 Proof..." : "Generate Groth16 zkTLS Proof"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Proof Generated -> Submit to Arkiv */}
        {step === "PROVE" && zkBundle && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4" />
                  Groth16 Proof & Poseidon Nullifier Ready
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">Valid 7 Days</span>
              </div>

              <div className="space-y-2 text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-zinc-500">Poseidon Nullifier Hash:</span>
                  <span className="text-cyan-400 truncate max-w-[280px]">
                    {zkBundle.nullifierHash}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-zinc-500">TLS Transcript Commitment:</span>
                  <span className="text-zinc-400 truncate max-w-[280px]">
                    {zkBundle.tlsTranscriptCommitment}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-zinc-500">Groth16 Proof Digest:</span>
                  <span className="text-zinc-400 truncate max-w-[280px]">
                    {zkBundle.groth16ProofDigest}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Arkiv Execution: Uses <code className="text-emerald-400 font-mono">predictEntityKey</code> to deterministically register the UTR nullifier entity (blocking double-spends) and patches the order to <code className="text-blue-400 font-mono">SETTLED</code>.
            </p>

            <button
              onClick={handleSettleOnArkiv}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 disabled:opacity-50 transition-all"
            >
              {isProcessing ? "Settling on Arkiv DB-Chain..." : "Settle on Arkiv DB-Chain"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "SETTLE_SUCCESS" && (
          <div className="text-center py-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white">Order Successfully Settled on Arkiv!</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                The atomic settlement has been confirmed on Tiramisu DB-Chain. The nullifier entity is permanently registered, preventing any reuse of the synthetic UTR.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Close & Return to Orderbook
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
