"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Wallet,
  ShieldCheck,
  KeyRound,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  RotateCw,
} from "lucide-react";

export default function PayerSetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [companyName, setCompanyName] = useState("Acme Services");
  const [walletAccount, setWalletAccount] = useState("");
  const [perInvoiceMaxDollars, setPerInvoiceMaxDollars] = useState("1.00");
  const [monthlyLimitDollars, setMonthlyLimitDollars] = useState("5.00");
  const [durationDays, setDurationDays] = useState(90);

  // Signing & preparation states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeModal, setActiveModal] = useState<"M1" | "M2" | "M3" | null>(null);
  const [rulesCorrelationId, setRulesCorrelationId] = useState("");
  const [grantCorrelationId, setGrantCorrelationId] = useState("");
  const [previewSummary, setPreviewSummary] = useState("");

  // Deposit states
  const [depositAddress, setDepositAddress] = useState("");
  const [copied, setCopied] = useState(false);

  // 1. Connect Wallet (M1)
  const handleConnectWallet = (acc: string) => {
    setWalletAccount(acc);
    setActiveModal(null);
    setCurrentStep(3);
  };

  // 2. Prepare Rules Approval (M2)
  const handlePrepareRules = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const perTxCents = Math.round(parseFloat(perInvoiceMaxDollars || "1.00") * 100);
      const monthlyBudget = parseFloat(monthlyLimitDollars || "5.00");

      const res = await fetch("/api/payer/agent/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: {
            type: "near",
            account_id: walletAccount || "payer.near",
            public_key: "ed25519:6E8sCci9badyRkXb3JoRpAxTMwxDoW7QA45qTCTNWDDG",
          },
          perTxCapCents: perTxCents,
          monthlyBudgetUsd: monthlyBudget,
          companyName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare spending rules");

      setRulesCorrelationId(data.correlation_id);
      setPreviewSummary(
        data.preview?.summary ||
          `Authorize assistant with a $${perInvoiceMaxDollars} per-invoice cap and a $${monthlyLimitDollars} monthly budget.`
      );
      setActiveModal("M2");
    } catch (err: any) {
      setErrorMsg(`${err.message} The Payment Assistant is awaiting platform activation; no funds were moved.`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Rules Signature (M2)
  const handleSignRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payer/agent/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correlation_id: rulesCorrelationId,
          signed_data: { standard: "nep366", payload: { nonce: Date.now() } },
        }),
      });
      if (!res.ok) throw new Error("Approval failed. Please retry.");
      setActiveModal(null);
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMsg(`${err.message} The Payment Assistant is awaiting platform activation; no funds were moved.`);
    } finally {
      setLoading(false);
    }
  };

  // 4. Prepare Payment Permission (M3)
  const handlePrepareGrant = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/payer/grant/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare payment permission");

      setGrantCorrelationId(data.correlation_id);
      setActiveModal("M3");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Submit Payment Permission Signature (M3)
  const handleSignGrant = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payer/grant/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correlation_id: grantCorrelationId,
          signed_data: { standard: "nep413", payload: { nonce: Date.now() } },
        }),
      });
      if (!res.ok) throw new Error("Permission approval failed.");
      setActiveModal(null);

      // Fetch deposit address for Step 6
      const depRes = await fetch("/api/payer/deposit", { method: "POST" });
      const depData = await depRes.json();
      setDepositAddress(depData.deposit_address || "nearbligo-vault.near");

      setCurrentStep(6);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepsTotal = 6;
  const progressPercent = Math.round((currentStep / stepsTotal) * 100);

  return (
    <div className="min-h-screen bg-[#0A1220] text-[#E8EEF7] flex flex-col justify-between font-sans p-4 sm:p-8">
      {/* Top Header & Progress */}
      <div className="max-w-xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between text-xs text-[#93A4BD]">
          <span className="font-semibold text-[#E8EEF7]">Payer Assistant Setup</span>
          <span>Step {currentStep} of {stepsTotal}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#111C30] overflow-hidden">
          <div
            className="h-full bg-[#34D399] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <div className="max-w-xl mx-auto w-full my-auto py-8">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-6 shadow-xl">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 text-xs text-[#DC2626]">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E8EEF7]">Welcome to Nearbligo</h2>
                <p className="text-xs text-[#93A4BD] mt-1">
                  Let&apos;s configure your automated accounts payable assistant in a few simple steps.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#93A4BD]">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-sm text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  placeholder="e.g. Acme Freight Logistics"
                />
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                disabled={!companyName.trim()}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Connect Wallet (Modal M1 Trigger) */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E8EEF7]">Connect your wallet</h2>
                <p className="text-xs text-[#93A4BD] mt-1">
                  Connect the payout wallet that holds authority over your spending limits.
                </p>
              </div>

              {walletAccount ? (
                <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] flex items-center justify-between">
                  <div className="text-xs text-[#93A4BD]">Connected Account</div>
                  <div className="font-mono text-xs font-bold text-[#34D399]">{walletAccount}</div>
                </div>
              ) : null}

              <button
                onClick={() => setActiveModal("M1")}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>{walletAccount ? "Change Wallet" : "Select Wallet"}</span>
              </button>

              {walletAccount && (
                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full py-2.5 rounded-xl bg-[#22314A] hover:bg-[#22314A]/80 text-[#E8EEF7] font-semibold text-xs transition-colors"
                >
                  Continue with this account &rarr;
                </button>
              )}
            </div>
          )}

          {/* STEP 3: Spending Rules Form */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E8EEF7]">Set spending rules</h2>
                <p className="text-xs text-[#93A4BD] mt-1">
                  Your assistant will strictly enforce these limits before releasing any payment.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#93A4BD]">
                    Most I&apos;ll pay per invoice (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    value={perInvoiceMaxDollars}
                    onChange={(e) => setPerInvoiceMaxDollars(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-sm text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#93A4BD]">
                    Most I&apos;ll pay per month (USD)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={monthlyLimitDollars}
                    onChange={(e) => setMonthlyLimitDollars(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-sm text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  />
                </div>

                {/* Live Sentence Summary per Section 3 */}
                <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#93A4BD] leading-relaxed">
                  Your assistant can pay up to{" "}
                  <strong className="text-[#34D399]">${perInvoiceMaxDollars || "0.00"}</strong> per
                  invoice and{" "}
                  <strong className="text-[#34D399]">${monthlyLimitDollars || "0.00"}</strong> per
                  month, only to vendors you approve.
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(4)}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Save rules & continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 4: Approve Rules (Modal M2 Trigger) */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E8EEF7]">Approve your spending rules</h2>
                <p className="text-xs text-[#93A4BD] mt-1">
                  Authorize your assistant by signing your configured rules in your wallet.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] space-y-2 text-xs">
                <div className="flex justify-between text-[#93A4BD]">
                  <span>Per-invoice ceiling:</span>
                  <span className="font-bold text-[#E8EEF7]">${perInvoiceMaxDollars} USD</span>
                </div>
                <div className="flex justify-between text-[#93A4BD]">
                  <span>Monthly budget cap:</span>
                  <span className="font-bold text-[#E8EEF7]">${monthlyLimitDollars} USD</span>
                </div>
              </div>

              <button
                onClick={handlePrepareRules}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Approve in your wallet</span>
              </button>
            </div>
          )}

          {/* STEP 5: Allow Nearbligo to Pay (Modal M3 Trigger) */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E8EEF7]">Allow Nearbligo to pay for you</h2>
                <p className="text-xs text-[#93A4BD] mt-1">
                  Select how long your assistant is authorized to automatically pay approved invoices.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[30, 90, 365].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDurationDays(days)}
                    className={`py-3 rounded-xl text-xs font-bold transition-colors border ${
                      durationDays === days
                        ? "bg-[#34D399]/15 text-[#34D399] border-[#34D399]"
                        : "bg-[#0A1220] text-[#93A4BD] border-[#22314A] hover:border-[#93A4BD]"
                    }`}
                  >
                    {days} Days {days === 90 ? "(Default)" : ""}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePrepareGrant}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Authorize payment permission</span>
              </button>
            </div>
          )}

          {/* STEP 6: Add Funds & Auto-Detect */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E8EEF7]">Add funds</h2>
                <p className="text-xs text-[#93A4BD] mt-1">
                  Transfer USDT on NEAR to fund your assistant.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] space-y-3">
                <div className="text-[11px] text-[#93A4BD]">Deposit Address (USDT on NEAR):</div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#111C30] border border-[#22314A] font-mono text-xs">
                  <span className="truncate text-[#E8EEF7]">{depositAddress || "nearbligo-vault.near"}</span>
                  <button
                    onClick={() => copyToClipboard(depositAddress || "nearbligo-vault.near")}
                    className="p-1 hover:text-[#34D399] transition-colors ml-2 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#34D399]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-[#D97706] font-medium">
                  Notice: Only send USDT on NEAR (nep141:usdt.tether-token.near).
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-[#93A4BD] py-2">
                <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                <span>Waiting for your deposit...</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/payer"
                  className="text-xs text-[#93A4BD] hover:text-[#E8EEF7] transition-colors"
                >
                  Skip for now
                </Link>
                <button
                  onClick={() => setCurrentStep(7)}
                  className="px-6 py-2.5 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors"
                >
                  I&apos;ve sent it &rarr;
                </button>
              </div>
            </div>
          )}

          {/* DONE SCREEN */}
          {currentStep === 7 && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center mx-auto border-2 border-[#34D399]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#E8EEF7]">Setup Complete!</h2>
                <p className="text-xs text-[#93A4BD] mt-1 max-w-sm mx-auto">
                  Your accounts payable assistant is live, authorized, and ready to process vendor invoices autonomously.
                </p>
              </div>
              <Link
                href="/payer/vendors"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-all shadow-lg"
              >
                <span>Invite your first contractor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="max-w-xl mx-auto w-full text-center text-[11px] text-[#5B6B82]">
        All permissions are cryptographically verified and revocable at any time.
      </footer>

      {/* MODAL M1: Connect Wallet */}
      {activeModal === "M1" && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <h3 className="text-base font-bold text-[#E8EEF7]">Connect your wallet</h3>
            <p className="text-xs text-[#93A4BD]">
              Select an account to authorize your assistant&apos;s spending rules.
            </p>
            <div className="space-y-2">
              {["acme-freight.near", "logistics-treasury.near", "obligoo.near"].map((acc) => (
                <button
                  key={acc}
                  onClick={() => handleConnectWallet(acc)}
                  className="w-full p-3.5 rounded-xl bg-[#0A1220] border border-[#22314A] hover:border-[#34D399] text-left text-xs font-mono font-semibold text-[#E8EEF7] flex items-center justify-between transition-colors"
                >
                  <span>{acc}</span>
                  <span className="text-[#34D399] font-sans text-[11px]">Connect &rarr;</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#22314A] text-xs text-[#93A4BD] hover:text-[#E8EEF7]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL M2: Approve Rules */}
      {activeModal === "M2" && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <h3 className="text-base font-bold text-[#E8EEF7]">Approve spending rules</h3>
            <p className="text-xs text-[#93A4BD]">{previewSummary}</p>
            <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] text-[11px] text-[#93A4BD] space-y-1">
              <div>&bull; Max per invoice: ${perInvoiceMaxDollars} USD</div>
              <div>&bull; Max per month: ${monthlyLimitDollars} USD</div>
              <div>&bull; Allowed asset: USDT on NEAR</div>
            </div>
            <button
              onClick={handleSignRules}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Checking your wallet...</span>
                </>
              ) : (
                <span>Approve in your wallet</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL M3: Allow Payments */}
      {activeModal === "M3" && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <h3 className="text-base font-bold text-[#E8EEF7]">Allow Nearbligo to pay for you</h3>
            <p className="text-xs text-[#93A4BD]">
              Let Nearbligo pay approved invoices until{" "}
              {new Date(Date.now() + durationDays * 86400000).toLocaleDateString()}.
            </p>
            <button
              onClick={handleSignGrant}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Checking your wallet...</span>
                </>
              ) : (
                <span>Confirm payment permission</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
