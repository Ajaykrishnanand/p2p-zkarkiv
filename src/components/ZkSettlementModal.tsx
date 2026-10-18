"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Fingerprint,
  EyeOff,
  AlertCircle,
  Smartphone,
  CreditCard,
  Building2,
  Check,
  Delete,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { P2POrderEntity } from "@/lib/arkivOrderbook";
import {
  simulateBankTlsSession,
  generateZkTlsProof,
  BankTlsSession,
  ZkProofBundle,
} from "@/lib/zkTlsProver";
import { generateSyntheticUtr } from "@/lib/syntheticGuard";
import { ARKIV_EXPLORER_URL } from "@/lib/arkivClient";
import { BASE_SEPOLIA_ESCROW_ADDRESS, getBaseScanAddressUrl } from "@/lib/baseEscrowClient";

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
  const [step, setStep] = useState<
    "LOCK" | "UPI_PAYMENT" | "ZKTLS_NOTARIZE" | "PROVE" | "SETTLE_SUCCESS"
  >("LOCK");

  // UPI Simulator State
  const [selectedApp, setSelectedApp] = useState<"GPAY" | "PHONEPE" | "PAYTM" | "BHIM">("GPAY");
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank (•••• 4921)");
  const [upiPin, setUpiPin] = useState<string>("");
  const [isUpiProcessing, setIsUpiProcessing] = useState<boolean>(false);
  const [upiPaymentDone, setUpiPaymentDone] = useState<boolean>(false);
  const [generatedUtr, setGeneratedUtr] = useState<string>("");

  // Cryptographic state
  const [tlsSession, setTlsSession] = useState<BankTlsSession | null>(null);
  const [zkBundle, setZkBundle] = useState<ZkProofBundle | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const isAlreadyLocked = order.attributes?.status === "LOCKED";
  const amountInr = Number(order.attributes?.amountInr || 5000);
  const payeeAlias = order.data?.syntheticUpiAlias || "merchant01.synth@okhdfc";

  // Step 1: Lock Order on Arkiv DB-Chain
  const handleLockOrder = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      await onLockOrder(order);
      setStep("UPI_PAYMENT");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to lock order on Arkiv.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Simulate Indian UPI Payment
  const handlePinDigit = (digit: string) => {
    if (upiPin.length < 6) {
      setUpiPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setUpiPin((prev) => prev.slice(0, -1));
  };

  const handleExecuteUpiPayment = async () => {
    try {
      setIsUpiProcessing(true);
      setErrorMsg(null);
      // Simulate real-time NPCI switch handshake
      await new Promise((r) => setTimeout(r, 900));

      const utr = generateSyntheticUtr();
      setGeneratedUtr(utr);
      setUpiPaymentDone(true);

      // Create TLS 1.3 banking session
      const session = simulateBankTlsSession({
        amountInr,
        recipientAlias: payeeAlias,
        syntheticUtr: utr,
      });
      setTlsSession(session);
    } catch (e: any) {
      setErrorMsg(e?.message || "UPI Payment failed");
    } finally {
      setIsUpiProcessing(false);
    }
  };

  // Step 3: Inspect TLS Transcript & Generate zkTLS Proof
  const handleGenerateProof = async () => {
    if (!tlsSession) {
      const utr = generatedUtr || generateSyntheticUtr();
      const session = simulateBankTlsSession({
        amountInr,
        recipientAlias: payeeAlias,
        syntheticUtr: utr,
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

  // Step 4: Settle on Arkiv DB-Chain
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">
                P2P UPI Payment & zkTLS Settlement
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                Arkiv DB-Chain + Base Escrow
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{order.data?.orderId || "ORD"} • ₹{amountInr.toLocaleString("en-IN")} INR ({order.data?.usdcAmount} USDC)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Phase Progress Flow Bar */}
        <div className="grid grid-cols-4 gap-2 my-5 text-xs font-semibold">
          {/* Step 1: Lock */}
          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              step === "LOCK" && !isAlreadyLocked
                ? "bg-amber-50 border-amber-300 text-amber-900 shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              <span>1. Lock</span>
            </div>
            <span className="text-[9px] font-mono block opacity-75">patchEntity</span>
          </div>

          {/* Step 2: UPI Simulator */}
          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              step === "UPI_PAYMENT" || (isAlreadyLocked && step === "LOCK")
                ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>2. UPI Pay</span>
            </div>
            <span className="text-[9px] font-mono block opacity-75">Simulator</span>
          </div>

          {/* Step 3: zkTLS Notarize */}
          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              step === "ZKTLS_NOTARIZE"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <EyeOff className="w-3 h-3" />
              <span>3. zkTLS</span>
            </div>
            <span className="text-[9px] font-mono block opacity-75">Zero PII</span>
          </div>

          {/* Step 4: Settle */}
          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              step === "PROVE" || step === "SETTLE_SUCCESS"
                ? "bg-blue-50 border-blue-300 text-blue-900 shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Fingerprint className="w-3 h-3" />
              <span>4. Settle</span>
            </div>
            <span className="text-[9px] font-mono block opacity-75">predictKey</span>
          </div>
        </div>

        {/* ========================================================
            PHASE 1: Lock Order on Arkiv DB-Chain
           ======================================================== */}
        {step === "LOCK" && !isAlreadyLocked && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payee Synthetic UPI:</span>
                <span className="font-mono font-bold text-slate-800">{payeeAlias}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Fiat Due:</span>
                <span className="font-bold text-slate-900">₹{amountInr.toLocaleString("en-IN")} INR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Escrow USDC Release:</span>
                <span className="font-mono font-bold text-emerald-600">{order.data?.usdcAmount} USDC</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Lock Window:</span>
                <span className="font-mono text-amber-700 font-semibold">30 Minutes (Ephemeral TTL)</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Locking calls <code className="text-slate-900 font-mono font-bold">patchEntity</code> on Arkiv Tiramisu. The maker’s escrowed USDC on Base Sepolia is reserved exclusively for you during this payment window.
            </p>

            <button
              onClick={handleLockOrder}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isProcessing ? "Locking on Arkiv DB-Chain..." : "Lock Order on Arkiv & Proceed to UPI"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================
            PHASE 2: Interactive UPI Payment Simulator
           ======================================================== */}
        {(step === "UPI_PAYMENT" || (isAlreadyLocked && step === "LOCK")) && (
          <div className="space-y-4">
            {/* Simulated UPI Mobile App Card */}
            <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm space-y-4">
              {/* App Selector Pills */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  Simulated Indian UPI App
                </span>
                <div className="flex gap-1">
                  {(["GPAY", "PHONEPE", "PAYTM", "BHIM"] as const).map((app) => (
                    <button
                      key={app}
                      onClick={() => setSelectedApp(app)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                        selectedApp === app
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient VPA Header */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600 text-sm">
                    ₹
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm">{payeeAlias}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Verified Maker • Synthetic UPI Coordinate
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">
                    ₹{amountInr.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                    Zero Transfer Fee
                  </span>
                </div>
              </div>

              {/* Bank Account Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  Paying From Bank Account:
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="HDFC Bank (•••• 4921)">HDFC Bank (Savings •••• 4921)</option>
                  <option value="ICICI Bank (•••• 9102)">ICICI Bank (Salary •••• 9102)</option>
                  <option value="State Bank of India (•••• 3310)">State Bank of India (•••• 3310)</option>
                  <option value="Axis Bank (•••• 7712)">Axis Bank (•••• 7712)</option>
                </select>
              </div>

              {/* UPI PIN Entry or Execution */}
              {!upiPaymentDone ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Enter 6-Digit UPI PIN to Authorize:
                  </span>

                  {/* PIN Dots */}
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          upiPin.length > i
                            ? "bg-indigo-600 border-indigo-600 scale-110"
                            : "bg-white border-slate-300"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        onClick={() => handlePinDigit(num)}
                        className="py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => setUpiPin("")}
                      className="py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handlePinDigit("0")}
                      className="py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
                    >
                      0
                    </button>
                    <button
                      onClick={handleBackspace}
                      className="py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                    >
                      <Delete className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setUpiPin("123456");
                        handleExecuteUpiPayment();
                      }}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition-colors"
                    >
                      Autofill PIN (123456)
                    </button>
                    <button
                      onClick={handleExecuteUpiPayment}
                      disabled={isUpiProcessing}
                      className="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      {isUpiProcessing ? (
                        <span>Contacting NPCI...</span>
                      ) : (
                        <span>Pay ₹{amountInr} via UPI</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Payment Success Feedback */
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-center space-y-2 animate-fadeIn">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    UPI Payment Successful!
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Paid ₹{amountInr.toLocaleString("en-IN")} to{" "}
                    <code className="text-slate-900 font-bold font-mono">{payeeAlias}</code>
                  </p>
                  <div className="p-2 rounded bg-white border border-emerald-200 text-xs font-mono text-emerald-800 inline-block font-bold">
                    UTR: {generatedUtr}
                  </div>
                </div>
              )}
            </div>

            {/* Next Action: Proceed to zkTLS */}
            {upiPaymentDone && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                <p className="text-xs text-slate-500">
                  Your bank and NPCI have confirmed the payment. Now, our client-side zkTLS notarizer will capture the TLS 1.3 session and prove payment validity without leaking your private bank statement or balance.
                </p>
                <button
                  onClick={() => setStep("ZKTLS_NOTARIZE")}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Proceed to zkTLS Session Notarization</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            PHASE 3: zkTLS TLS 1.3 Notarization & Redaction
           ======================================================== */}
        {step === "ZKTLS_NOTARIZE" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Bank HTTPS TLS 1.3 Transcript Inspection
                </span>
                <span className="font-mono text-slate-400 text-[11px]">NPCI / Core HSM</span>
              </div>

              {/* Redacted JSON view */}
              <div className="bg-slate-900 p-3.5 rounded-xl text-[11px] font-mono text-slate-200 space-y-1 shadow-inner">
                <div className="text-slate-400">// Client-Side Ephemeral TLS Transcript (Zero-Knowledge Redacted)</div>
                <div>{"{"}</div>
                <div className="pl-4">
                  <span className="text-slate-400">"status":</span> <span className="text-emerald-400 font-bold">"SUCCESS"</span>,
                </div>
                <div className="pl-4">
                  <span className="text-slate-400">"amount":</span> <span className="text-white font-bold">{amountInr}</span>,
                </div>
                <div className="pl-4">
                  <span className="text-slate-400">"payeeVpa":</span> <span className="text-slate-200">"{payeeAlias}"</span>,
                </div>
                <div className="pl-4">
                  <span className="text-slate-400">"utr":</span> <span className="text-cyan-400 font-bold">"{tlsSession?.redactedResponseBody.utr || generatedUtr}"</span>,
                </div>
                <div className="pl-4 text-emerald-400/90 font-semibold">
                  <span className="text-slate-400">"payerAccount":</span> "REDACTED_BY_ZKTLS_ENCLAVE",
                </div>
                <div className="pl-4 text-emerald-400/90 font-semibold">
                  <span className="text-slate-400">"remainingBalance":</span> "REDACTED_BY_ZKTLS_ENCLAVE",
                </div>
                <div className="pl-4 text-emerald-400/90 font-semibold">
                  <span className="text-slate-400">"personalKycName":</span> "REDACTED_BY_ZKTLS_ENCLAVE"
                </div>
                <div>{"}"}</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Zero-Screenshot Guarantee:</strong> Neither the raw bank HTML, nor your account balance, nor your real bank statement ever touches Arkiv or any public blockchain. A client-side Groth16 circuit proves the cryptographic commitment off-chain.
            </p>

            <button
              onClick={handleGenerateProof}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isProcessing ? "Computing Groth16 Proof & Poseidon Nullifier..." : "Generate Groth16 zkTLS Proof"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================
            PHASE 4: Settle on Arkiv DB-Chain & Release Escrow
           ======================================================== */}
        {step === "PROVE" && zkBundle && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                  Groth16 Proof & Poseidon Nullifier Ready
                </span>
                <span className="text-slate-500 font-mono text-[11px]">7-Day Arkiv TTL</span>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-800 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Poseidon Nullifier Hash:</span>
                  <span className="text-cyan-700 font-bold truncate max-w-[280px]">
                    {zkBundle.nullifierHash}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TLS Commitment:</span>
                  <span className="text-slate-700 truncate max-w-[280px]">
                    {zkBundle.tlsTranscriptCommitment}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Groth16 Digest:</span>
                  <span className="text-slate-700 truncate max-w-[280px]">
                    {zkBundle.groth16ProofDigest}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Base Sepolia Escrow:</span>
                  <span className="text-slate-900 font-bold">contracts/BaseSepoliaEscrow.sol</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Arkiv DB-Chain Execution:</strong> Uses <code className="text-slate-900 font-bold font-mono">predictEntityKey</code> to deterministically register the UTR nullifier entity (blocking double-spends) and patches the order to <code className="text-blue-600 font-bold font-mono">SETTLED</code>.
            </p>

            <button
              onClick={handleSettleOnArkiv}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isProcessing ? "Settling on Arkiv DB-Chain..." : "Settle on Arkiv DB-Chain & Release USDC"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================
            PHASE 5: Settlement Success & Explorer Details
           ======================================================== */}
        {step === "SETTLE_SUCCESS" && (
          <div className="text-center py-6 space-y-4 animate-fadeIn">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">
                P2P Trade Successfully Settled on Arkiv!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                The atomic settlement has been confirmed on Arkiv Tiramisu. The nullifier entity is permanently registered, preventing any double-spending of the synthetic UTR.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono max-w-md mx-auto text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Arkiv Entity Key:</span>
                <a
                  href={`${ARKIV_EXPLORER_URL}/entity/${order.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  {order.key.slice(0, 14)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Released to Taker:</span>
                <span className="font-bold text-slate-900">{order.data?.usdcAmount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fiat Verified:</span>
                <span className="font-bold text-slate-900">₹{amountInr.toLocaleString("en-IN")} INR</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Base Sepolia Escrow:</span>
                <a
                  href={getBaseScanAddressUrl(BASE_SEPOLIA_ESCROW_ADDRESS)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  {BASE_SEPOLIA_ESCROW_ADDRESS.slice(0, 10)}... (BaseScan)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                Return to Live Trading Terminal
              </button>
            </div>
          </div>
        )}

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
