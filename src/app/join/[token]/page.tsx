"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Truck,
  Building2,
  Wallet,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  RotateCw,
} from "lucide-react";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [step, setStep] = useState<"loading" | "accept" | "payout" | "confirm" | "invalid">("loading");
  const [invalidMsg, setInvalidMsg] = useState("");

  const [inviteData, setInviteData] = useState<{
    vendor_id?: string;
    vendor_name?: string;
    company_name?: string;
  }>({});

  // Accept fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");

  // Payout account fields
  const [payoutAccount, setPayoutAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invites/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          setStep("invalid");
          setInvalidMsg(data.message || "This invite link is invalid or has expired.");
        } else {
          setInviteData(data);
          setCompany(data.vendor_name || "");
          setStep("accept");
        }
      })
      .catch(() => {
        setStep("invalid");
        setInvalidMsg("Could not verify invite. Please check your connection.");
      });
  }, [token]);

  // Handle Step A2: Account creation
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          company: company || inviteData.vendor_name,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept invite");
      setStep("payout");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Step C2: Check payout account format & existence
  const handleCheckPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const cleaned = payoutAccount.trim().toLowerCase();
      const res = await fetch("/api/vendor/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: inviteData.vendor_id,
          account_id: cleaned,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify payout account");
      setPayoutAccount(data.account_id);
      setStep("confirm");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm payout and proceed to C3
  const handleConfirmAndProceed = () => {
    if (inviteData.vendor_id) {
      window.sessionStorage.setItem("nearbligo_vendor_id", inviteData.vendor_id);
      router.push(`/contractor/waiting?vendor_id=${encodeURIComponent(inviteData.vendor_id)}`);
    } else {
      router.push("/contractor/waiting");
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#0A1220] text-[#E8EEF7] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-[#93A4BD]">
          <RotateCw className="w-5 h-5 animate-spin text-[#34D399]" />
          <span>Verifying invite link...</span>
        </div>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen bg-[#0A1220] text-[#E8EEF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#111C30] border border-[#22314A] text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#DC2626]/15 text-[#DC2626] flex items-center justify-center mx-auto border border-[#DC2626]/30">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#E8EEF7]">Invite Link Unavailable</h1>
          <p className="text-xs text-[#93A4BD]">{invalidMsg}</p>
          <div className="pt-2">
            <span className="text-xs text-[#5B6B82]">Ask your payer for a new link.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1220] text-[#E8EEF7] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-6 shadow-xl">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 text-xs text-[#DC2626]">
            {errorMsg}
          </div>
        )}

        {/* STEP A2: Accept Invite */}
        {step === "accept" && (
          <form onSubmit={handleAcceptInvite} className="space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E8EEF7]">
                {inviteData.company_name || "Acme Freight"} invited you to send invoices
              </h1>
              <p className="text-xs text-[#93A4BD] mt-1">
                Create your contractor profile to start submitting invoices.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#93A4BD]">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-sm text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  placeholder="e.g. Alex Rivera"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#93A4BD]">Company Name</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-sm text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  placeholder="e.g. Apex Fuel Logistics"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#93A4BD]">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-sm text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  placeholder="Create a secure password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <RotateCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Continue to Payout Details</span>
            </button>
          </form>
        )}

        {/* STEP C2: Enter Payout Account (Section 13 override) */}
        {step === "payout" && (
          <form onSubmit={handleCheckPayout} className="space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E8EEF7]">Enter your payout account</h1>
              <p className="text-xs text-[#93A4BD] mt-1">
                Enter your NEAR account name to receive USDT invoice payments directly.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#93A4BD]">
                NEAR Account Name
              </label>
              <input
                type="text"
                required
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-sm font-mono text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                placeholder="e.g. apex-fuel.near"
              />
              <p className="text-[11px] text-[#5B6B82] pt-1">
                Payments are made in USDT on NEAR.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !payoutAccount.trim()}
              className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <RotateCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Verify & Continue</span>
            </button>
          </form>
        )}

        {/* STEP C2 Confirm: 'Is this correct? Payments go to [account].' */}
        {step === "confirm" && (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center mx-auto border border-[#34D399]/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E8EEF7]">Is this correct?</h1>
              <p className="text-xs text-[#93A4BD] mt-1">
                Payments will be deposited directly to this account:
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A]">
              <span className="font-mono text-base font-bold text-[#34D399]">{payoutAccount}</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConfirmAndProceed}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors"
              >
                Yes, continue to dashboard &rarr;
              </button>
              <button
                onClick={() => setStep("payout")}
                className="w-full py-2.5 rounded-xl bg-[#22314A] text-[#93A4BD] hover:text-[#E8EEF7] text-xs font-semibold transition-colors"
              >
                Change account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
