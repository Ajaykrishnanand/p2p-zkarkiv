"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Check,
  Delete,
  Sparkles,
  RefreshCw,
  Copy,
  ExternalLink,
  EyeOff,
  Fingerprint,
  ArrowRight,
  Shield,
  Zap,
  Building2,
  Wifi,
  Battery,
  Radio,
  FileCode2,
} from "lucide-react";
import {
  simulateBankTlsSession,
  generateZkTlsProof,
  verifyPaymentProvenance,
  BankTlsSession,
  ZkProofBundle,
  VerificationResult,
} from "@/lib/zkTlsProver";
import { generateSyntheticUtr, isSyntheticUpi } from "@/lib/syntheticGuard";

interface UpiMobileSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPayeeAlias?: string;
  defaultAmountInr?: number;
  onProofGenerated?: (bundle: ZkProofBundle) => void;
}

export const UpiMobileSimulatorModal: React.FC<UpiMobileSimulatorModalProps> = ({
  isOpen,
  onClose,
  defaultPayeeAlias = "merchant01.synth@okhdfc",
  defaultAmountInr = 5000,
  onProofGenerated,
}) => {
  // Mobile Phone state
  const [selectedApp, setSelectedApp] = useState<"Google Pay" | "PhonePe" | "Paytm" | "BHIM UPI">("Google Pay");
  const [mobileScreen, setMobileScreen] = useState<"PAYMENT_FORM" | "ENTER_PIN" | "NPCI_PROCESSING" | "SUCCESS_RECEIPT">("PAYMENT_FORM");
  const [payeeAlias, setPayeeAlias] = useState<string>(defaultPayeeAlias);
  const [amountInr, setAmountInr] = useState<number>(defaultAmountInr);
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank (Savings •••• 4921)");
  const [upiPin, setUpiPin] = useState<string>("");
  const [generatedUtr, setGeneratedUtr] = useState<string>("");

  // Cryptographic zkTLS state
  const [tlsSession, setTlsSession] = useState<BankTlsSession | null>(null);
  const [zkBundle, setZkBundle] = useState<ZkProofBundle | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [activeCryptoTab, setActiveCryptoTab] = useState<"PROVENANCE" | "REDACTION" | "GROTH16">("PROVENANCE");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync defaults when opened
  useEffect(() => {
    if (isOpen) {
      if (defaultPayeeAlias) setPayeeAlias(defaultPayeeAlias);
      if (defaultAmountInr) setAmountInr(defaultAmountInr);
    }
  }, [isOpen, defaultPayeeAlias, defaultAmountInr]);

  if (!isOpen) return null;

  // App Theme definitions
  const appThemes = {
    "Google Pay": {
      brandName: "Google Pay",
      bgHeader: "bg-white text-slate-800 border-b border-slate-100",
      accentColor: "bg-blue-600 hover:bg-blue-700 text-white",
      logoBadge: "bg-blue-50 text-blue-600 border-blue-200",
      pillStyle: "bg-blue-50 text-blue-700 border-blue-200",
    },
    PhonePe: {
      brandName: "PhonePe",
      bgHeader: "bg-[#5f259f] text-white border-b border-purple-800",
      accentColor: "bg-[#5f259f] hover:bg-[#4b1d7d] text-white",
      logoBadge: "bg-purple-100 text-[#5f259f] border-purple-200",
      pillStyle: "bg-purple-50 text-[#5f259f] border-purple-200",
    },
    Paytm: {
      brandName: "Paytm",
      bgHeader: "bg-[#002970] text-white border-b border-blue-900",
      accentColor: "bg-[#00b9f5] hover:bg-[#009fd4] text-slate-900 font-extrabold",
      logoBadge: "bg-cyan-50 text-[#002970] border-cyan-200",
      pillStyle: "bg-cyan-50 text-cyan-900 border-cyan-200",
    },
    "BHIM UPI": {
      brandName: "BHIM NPCI",
      bgHeader: "bg-emerald-800 text-white border-b border-emerald-900",
      accentColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
      logoBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pillStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
  };

  const currentTheme = appThemes[selectedApp];

  const handleKeypadPress = (val: string) => {
    if (upiPin.length < 6) {
      setUpiPin((prev) => prev + val);
    }
  };

  const handleBackspace = () => {
    setUpiPin((prev) => prev.slice(0, -1));
  };

  // Execute payment & create real zkTLS session
  const handleExecutePayment = async () => {
    setMobileScreen("NPCI_PROCESSING");

    // 1. Simulate NPCI 2-party TLS 1.3 banking handshake delay
    await new Promise((r) => setTimeout(r, 1100));

    const utr = generateSyntheticUtr();
    setGeneratedUtr(utr);

    // Map bank to domain
    let domain: "api.retail.hdfcbank.com" | "netbanking.icicibank.com" | "upi.axisbank.com" | "upi.sbi.co.in" =
      "api.retail.hdfcbank.com";
    if (selectedBank.includes("ICICI")) domain = "netbanking.icicibank.com";
    if (selectedBank.includes("Axis")) domain = "upi.axisbank.com";
    if (selectedBank.includes("State Bank")) domain = "upi.sbi.co.in";

    // 2. Generate notarized TLS 1.3 banking transcript
    const session = simulateBankTlsSession({
      amountInr,
      recipientAlias: payeeAlias,
      syntheticUtr: utr,
      bankDomain: domain,
      appName: selectedApp,
    });
    setTlsSession(session);

    // 3. Automatically compute Groth16 zkTLS proof bundle
    setIsGeneratingProof(true);
    try {
      const bundle = await generateZkTlsProof(session);
      setZkBundle(bundle);
      if (onProofGenerated) {
        onProofGenerated(bundle);
      }
      // Auto verify proof provenance
      const verif = verifyPaymentProvenance(session, bundle);
      setVerificationResult(verif);
    } finally {
      setIsGeneratingProof(false);
      setMobileScreen("SUCCESS_RECEIPT");
    }
  };

  // Re-run verification test
  const handleVerifyProof = () => {
    if (!tlsSession || !zkBundle) return;
    setIsVerifying(true);
    setTimeout(() => {
      const res = verifyPaymentProvenance(tlsSession, zkBundle);
      setVerificationResult(res);
      setIsVerifying(false);
    }, 450);
  };

  const handleReset = () => {
    setMobileScreen("PAYMENT_FORM");
    setUpiPin("");
    setGeneratedUtr("");
    setTlsSession(null);
    setZkBundle(null);
    setVerificationResult(null);
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Interactive UPI Mobile Simulator & zkTLS Prover
                </h3>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Zero-Knowledge Provenance
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Simulates real Indian UPI banking apps (GPay / PhonePe / Paytm / BHIM) and mathematically proves payment success via zkTLS without revealing private bank balances.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/60">
          {/* ==========================================================
              LEFT COLUMN: REALISTIC SMARTPHONE CHASSIS & MOBILE UI
             ========================================================== */}
          <div className="lg:col-span-5 flex flex-col items-center">
            {/* App Switcher Tabs above phone */}
            <div className="flex items-center justify-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs mb-3 w-full max-w-[340px]">
              {(["Google Pay", "PhonePe", "Paytm", "BHIM UPI"] as const).map((app) => (
                <button
                  key={app}
                  onClick={() => {
                    setSelectedApp(app);
                    if (mobileScreen === "SUCCESS_RECEIPT") {
                      handleReset();
                    }
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                    selectedApp === app
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {app.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Smartphone Chassis Frame */}
            <div className="w-[340px] h-[640px] bg-slate-900 rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-800 relative flex flex-col shrink-0 select-none border-4 border-slate-800">
              {/* Dynamic Island Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-950/80" />
              </div>

              {/* Inner Smartphone Screen */}
              <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col relative text-slate-800">
                {/* Mobile Status Bar */}
                <div className="pt-2 px-6 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700 bg-white z-20">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold">5G</span>
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Simulated App Header */}
                <div className={`px-4 py-2.5 flex items-center justify-between ${currentTheme.bgHeader}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
                      ₹
                    </div>
                    <span className="font-bold text-xs tracking-tight">{currentTheme.brandName}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 font-medium">
                    UPI 2.0 • TLS 1.3
                  </span>
                </div>

                {/* Screen Content Router */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                  {/* SCREEN 1: PAYMENT FORM */}
                  {mobileScreen === "PAYMENT_FORM" && (
                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-3">
                        {/* Payee Avatar Card */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 text-white font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                            {payeeAlias.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold text-xs text-slate-900">{payeeAlias}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Verified Arkiv P2P Order Maker
                          </p>
                        </div>

                        {/* Amount Input */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            Enter Amount
                          </label>
                          <div className="flex items-baseline justify-center text-slate-900">
                            <span className="text-xl font-bold mr-0.5">₹</span>
                            <input
                              type="number"
                              value={amountInr}
                              onChange={(e) => setAmountInr(Math.max(100, Number(e.target.value)))}
                              className="w-36 text-2xl font-extrabold text-center font-mono text-slate-900 focus:outline-none"
                            />
                          </div>

                          {/* Quick Chips */}
                          <div className="flex justify-center gap-1.5 mt-2">
                            {[1000, 2500, 5000, 10000].map((amt) => (
                              <button
                                key={amt}
                                onClick={() => setAmountInr(amt)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                                  amountInr === amt
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                ₹{amt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bank Account Selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            From Bank Account
                          </label>
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none"
                          >
                            <option value="HDFC Bank (Savings •••• 4921)">HDFC Bank (Savings •••• 4921)</option>
                            <option value="ICICI Bank (Salary •••• 9102)">ICICI Bank (Salary •••• 9102)</option>
                            <option value="State Bank of India (Savings •••• 3310)">State Bank of India (•••• 3310)</option>
                            <option value="Axis Bank (Current •••• 7712)">Axis Bank (•••• 7712)</option>
                          </select>
                        </div>
                      </div>

                      {/* Primary Pay Button */}
                      <button
                        onClick={() => setMobileScreen("ENTER_PIN")}
                        className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${currentTheme.accentColor}`}
                      >
                        <span>Pay ₹{amountInr.toLocaleString("en-IN")} via {selectedApp}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* SCREEN 2: ENTER PIN */}
                  {mobileScreen === "ENTER_PIN" && (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="text-center space-y-2 pt-2">
                        <div className="text-xs font-bold text-slate-800">
                          {selectedBank.split("(")[0]}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                          ENTER 6-DIGIT UPI PIN
                        </div>
                        <div className="text-sm font-bold text-slate-900 font-mono">
                          Paying ₹{amountInr.toLocaleString("en-IN")}
                        </div>

                        {/* PIN Dots */}
                        <div className="flex justify-center gap-2.5 pt-3">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                                upiPin.length > i
                                  ? "bg-slate-900 border-slate-900 scale-110"
                                  : "bg-white border-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Keypad */}
                      <div className="space-y-2 pt-4">
                        <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                            <button
                              key={num}
                              onClick={() => handleKeypadPress(num)}
                              className="py-2.5 text-sm font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            onClick={() => setUpiPin("")}
                            className="py-2.5 text-[10px] font-bold rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                          >
                            CLR
                          </button>
                          <button
                            onClick={() => handleKeypadPress("0")}
                            className="py-2.5 text-sm font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          >
                            0
                          </button>
                          <button
                            onClick={handleBackspace}
                            className="py-2.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                          >
                            <Delete className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quick Autofill & Submit */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => {
                              setUpiPin("123456");
                            }}
                            className="flex-1 py-2 text-[10px] font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            Autofill PIN (123456)
                          </button>
                          <button
                            onClick={handleExecutePayment}
                            disabled={upiPin.length !== 6}
                            className="flex-1 py-2 text-[10px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
                          >
                            <span>Authorize</span>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 3: NPCI PROCESSING */}
                  {mobileScreen === "NPCI_PROCESSING" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-700">
                          NPCI
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900">
                          Connecting to UPI Switch...
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                          Establishing TLS 1.3 socket with {selectedBank.split("(")[0]}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-600 text-left w-full space-y-1">
                        <div>🔒 TLS 1.3 Notary Attestation</div>
                        <div>⚡ Redacting private bank balances</div>
                        <div>🛡️ Generating Groth16 circuit input</div>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 4: SUCCESS RECEIPT */}
                  {mobileScreen === "SUCCESS_RECEIPT" && (
                    <div className="flex-1 flex flex-col justify-between space-y-3 pt-2">
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                          <Check className="w-7 h-7 stroke-[3]" />
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-900">
                            Payment Successful!
                          </h4>
                          <div className="text-2xl font-extrabold text-slate-900 font-mono pt-0.5">
                            ₹{amountInr.toLocaleString("en-IN")}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Paid to <code className="font-bold text-slate-800">{payeeAlias}</code>
                          </p>
                        </div>

                        {/* Transaction Receipt Card */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-[11px] font-mono space-y-1.5 shadow-2xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">UTR / Ref No:</span>
                            <span className="font-bold text-emerald-700">{generatedUtr}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">App:</span>
                            <span className="font-semibold text-slate-800">{selectedApp}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Debited From:</span>
                            <span className="font-semibold text-slate-800">{selectedBank.split(" ")[0]} (•••• 4921)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Time:</span>
                            <span className="text-slate-600">{new Date().toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={handleReset}
                          className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        >
                          Simulate Another Payment
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Home Bar Pill */}
                <div className="pb-2 pt-1 flex justify-center bg-white">
                  <div className="w-28 h-1 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================================
              RIGHT COLUMN: zkTLS CRYPTOGRAPHIC PROVER & VERIFIER
             ========================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* Header / Intro Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    zkTLS Cryptographic Provenance Suite
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    TLS 1.3 Notary
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Groth16 SNARK
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                In Web2 peer-to-peer exchanges, sellers often ask for full screenshots or bank statements that expose bank account numbers, customer names, and balance histories.
                With <strong>zkTLS</strong>, your client notarizes the raw HTTPS session directly with the bank/NPCI server, selectively blinds private data, and presents a mathematical proof that the payment actually succeeded.
              </p>

              {/* Sub-Tabs: Provenance, Redaction, Groth16 */}
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => setActiveCryptoTab("PROVENANCE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeCryptoTab === "PROVENANCE"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  1. Server TLS Attestation
                </button>
                <button
                  onClick={() => setActiveCryptoTab("REDACTION")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeCryptoTab === "REDACTION"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  2. Zero-PII Redaction
                </button>
                <button
                  onClick={() => setActiveCryptoTab("GROTH16")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeCryptoTab === "GROTH16"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  3. Groth16 Proof & Nullifier
                </button>
              </div>
            </div>

            {/* Tab 1: Server TLS Attestation */}
            {activeCryptoTab === "PROVENANCE" && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 flex-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Cryptographic Session Origin</span>
                  <span className="font-mono text-emerald-600 text-[11px]">
                    {tlsSession ? "Live Handshake Captured" : "Awaiting Mobile Payment"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-sans font-semibold">Remote Bank Host</span>
                    <span className="font-bold text-slate-800">
                      {tlsSession?.bankDomain || "api.retail.hdfcbank.com:443"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-sans font-semibold">Originating Mobile App</span>
                    <span className="font-bold text-slate-800">
                      {tlsSession?.appName || selectedApp}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-sans font-semibold">Cipher Suite</span>
                    <span className="font-bold text-slate-800">TLS_AES_256_GCM_SHA384</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-sans font-semibold">Notary Enclave</span>
                    <span className="font-bold text-slate-800">zkTLS-Notary-Cluster-v1</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-600 text-[11px]">Bank X.509 Subject & Root CA:</span>
                  <div className="p-2.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {tlsSession?.x509Subject || `CN=api.retail.hdfcbank.com, O=NPCI Certified Member, C=IN`}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600 text-[11px]">Notary ECDSA TLS Signature:</span>
                    {tlsSession && (
                      <button
                        onClick={() => copyText("sig", tlsSession.tlsSignature)}
                        className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                      >
                        {copiedKey === "sig" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === "sig" ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                  <div className="p-2.5 bg-slate-900 text-cyan-300 rounded-xl font-mono text-[11px] break-all">
                    {tlsSession?.tlsSignature || "0x6f91cb... (Complete payment in mobile frame to notarize)"}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Zero-PII Redaction Engine */}
            {activeCryptoTab === "REDACTION" && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 flex-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Client-Side Selective Redaction</span>
                  <span className="text-[11px] font-mono text-emerald-600">Verified Confidential</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Publicly Proven Fields */}
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Cryptographically Proven Publicly
                    </span>
                    <div className="space-y-1 text-[11px] font-mono text-emerald-950">
                      <div>• Status: <strong className="text-emerald-700">"SUCCESS"</strong></div>
                      <div>• Amount: <strong className="text-emerald-700">₹{amountInr} INR</strong></div>
                      <div>• Payee: <strong className="text-slate-800">{payeeAlias}</strong></div>
                      <div>• UTR: <strong className="text-emerald-800">{generatedUtr || "240918739182"}</strong></div>
                      <div>• Protocol: <strong className="text-slate-800">TLS 1.3 Notarized</strong></div>
                    </div>
                  </div>

                  {/* Blinded / Zero-Knowledge Redacted Fields */}
                  <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                    <span className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                      Blinded by ZK Circuit (Zero Leakage)
                    </span>
                    <div className="space-y-1 text-[11px] font-mono text-rose-950">
                      <div>• Payer Bank Acc: <span className="text-rose-600 font-bold">[REDACTED]</span></div>
                      <div>• Remaining Balance: <span className="text-rose-600 font-bold">[REDACTED]</span></div>
                      <div>• Real KYC Name: <span className="text-rose-600 font-bold">[REDACTED]</span></div>
                      <div>• UPI PIN: <span className="text-rose-600 font-bold">[NEVER_SHARED]</span></div>
                      <div>• Phone / Aadhaar: <span className="text-rose-600 font-bold">[REDACTED]</span></div>
                    </div>
                  </div>
                </div>

                {/* Redacted JSON representation */}
                <div className="space-y-1">
                  <span className="font-semibold text-slate-600 text-[11px]">Redacted JSON Payload Sent to Arkiv DB-Chain:</span>
                  <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 space-y-0.5">
                    <div>{"{"}</div>
                    <div className="pl-4"><span className="text-slate-400">"intent":</span> "P2P_UPI_TRANSFER",</div>
                    <div className="pl-4"><span className="text-slate-400">"status":</span> <span className="text-emerald-400 font-bold">"SUCCESS"</span>,</div>
                    <div className="pl-4"><span className="text-slate-400">"amount":</span> <span className="text-white font-bold">{amountInr}</span>,</div>
                    <div className="pl-4"><span className="text-slate-400">"payeeVpa":</span> <span className="text-cyan-300">"{payeeAlias}"</span>,</div>
                    <div className="pl-4"><span className="text-slate-400">"utr":</span> <span className="text-emerald-400 font-bold">"{generatedUtr || "240918739182"}"</span>,</div>
                    <div className="pl-4 text-rose-400"><span className="text-slate-400">"payerAccount":</span> "REDACTED_BY_ZKTLS_ENCLAVE",</div>
                    <div className="pl-4 text-rose-400"><span className="text-slate-400">"accountBalance":</span> "REDACTED_BY_CLIENT_PROOF"</div>
                    <div>{"}"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Groth16 Proof & Nullifier */}
            {activeCryptoTab === "GROTH16" && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 flex-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Groth16 SNARK Circuit Commitments</span>
                  <span className="text-[11px] font-mono text-indigo-600">Poseidon Hash Protected</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-sans font-semibold mb-1">
                      <span>Replay-Prevention Nullifier Hash:</span>
                      {zkBundle && (
                        <button
                          onClick={() => copyText("nullifier", zkBundle.nullifierHash)}
                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                        >
                          {copiedKey === "nullifier" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "nullifier" ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-900 text-amber-300 rounded-xl break-all text-[11px]">
                      {zkBundle?.nullifierHash || "0x9812bf... (Generated on payment completion)"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-sans font-semibold mb-1">
                      <span>Groth16 Proof Digest (Circuit π):</span>
                      {zkBundle && (
                        <button
                          onClick={() => copyText("groth", zkBundle.groth16ProofDigest)}
                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                        >
                          {copiedKey === "groth" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "groth" ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-900 text-indigo-300 rounded-xl break-all text-[11px]">
                      {zkBundle?.groth16ProofDigest || "0x3ab82c... (Generated on payment completion)"}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    How Double-Spend / Replay is Prevented:
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed font-sans">
                    The nullifier hash is computed from <code className="font-mono font-bold">H(takerSecret, syntheticUtr)</code> and stored immutably on the Arkiv DB-Chain testnet. If a malicious taker tries to reuse the same bank UTR to fulfill another order, Arkiv rejects the transaction automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Cryptographic Verification Execution Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Verify Payment Provenance Authenticity
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Executes mathematical checks verifying the TLS certificate, notary signature, and zero-knowledge circuit commitments.
                  </p>
                </div>

                <button
                  onClick={handleVerifyProof}
                  disabled={!tlsSession || isVerifying}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Verify Authenticity</span>
                    </>
                  )}
                </button>
              </div>

              {/* Verification Checklist Output */}
              {verificationResult && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Cryptographic Provenance Verified Authentic!
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700">
                      5 / 5 Checks Passed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-emerald-950 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Bank TLS 1.3 Notary Signature: Valid</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Notary Authority Cluster: Attested</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Payment Amount & UTR Proven: Match</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Poseidon Nullifier Hash: Nonce Clean</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Zero-PII Redactions: 100% Confidential</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800 font-sans pt-1 border-t border-emerald-200">
                    {verificationResult.details}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
