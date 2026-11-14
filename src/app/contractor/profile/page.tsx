"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Building,
} from "lucide-react";

export default function ContractorProfilePage() {
  const [vendorName, setVendorName] = useState("Contractor");
  const [payoutAccount, setPayoutAccount] = useState("Not submitted");
  const [walletVerified, setWalletVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form for changing payout account
  const [newAccount, setNewAccount] = useState("");
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/invoices");
        const data = await res.json();
        if (data.vendor_name) setVendorName(data.vendor_name);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdatePayoutAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.trim()) return;

    setUpdating(true);
    setStatusMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/vendor/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_account: newAccount.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update payout account");
      }

      setPayoutAccount(data.payout_account);
      setWalletVerified(false); // Changing account requires payer re-approval
      setStatusMsg(
        `Account updated to ${data.payout_account}. Payer review is now required.`
      );
      setNewAccount("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update payout account");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#E8EEF7]">Contractor Profile</h1>
        <p className="text-xs text-[#93A4BD] mt-0.5">
          Your organization and verified payout account details.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#93A4BD] flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>Loading profile...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Organization Details */}
          <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#E8EEF7]">{vendorName}</h3>
                <span className="text-[11px] text-[#93A4BD]">Verified Logistics Provider</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#93A4BD]">Designated Payout Account:</span>
                <span className="font-mono font-bold text-[#34D399]">{payoutAccount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#93A4BD]">Verification Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#34D399]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{walletVerified ? "Verified on NEAR" : "Pending Payer Review"}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#93A4BD]">Disbursement Currency:</span>
                <span className="text-[#E8EEF7]">USDT (via NEAR Protocol)</span>
              </div>
            </div>
          </div>

          {/* Change Payout Account Form */}
          <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E8EEF7] uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-[#34D399]" />
              <span>Change Payout Account</span>
            </div>

            {/* Warning banner */}
            <div className="p-3.5 rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 text-xs text-[#D97706] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Notice Regarding Account Changes</span>
              </div>
              <p className="text-[11px] text-[#93A4BD] leading-relaxed">
                For security, changing your payout account will temporarily hold automated payments until your payer authorizes the new account on-chain.
              </p>
            </div>

            {statusMsg && (
              <div className="p-3 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 text-xs text-[#34D399] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 text-xs text-[#DC2626]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdatePayoutAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#93A4BD] mb-1.5">
                  New NEAR Account ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. yourname.near"
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs font-mono text-[#E8EEF7] placeholder-[#5B6B82] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <button
                type="submit"
                disabled={updating || !newAccount.trim()}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying on NEAR RPC...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Account Change</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
