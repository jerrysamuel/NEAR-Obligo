"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Sliders,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCw,
  Save,
  Lock,
} from "lucide-react";
import { formatCents, parseDollarsToCents } from "@/lib/money";

export default function PayerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [perTxCapDollars, setPerTxCapDollars] = useState("1.00");
  const [monthlyLimitDollars, setMonthlyLimitDollars] = useState("5.00");
  const [isSoftPaused, setIsSoftPaused] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/payer/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.policy) {
          setPerTxCapDollars((data.policy.per_tx_cap / 100).toFixed(2));
          setMonthlyLimitDollars((data.policy.monthly_limit / 100).toFixed(2));
          setExpiresAt(data.policy.expires_at);
        }
        if (data.agent) {
          setIsSoftPaused(Boolean(data.agent.soft_paused));
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const perTxCents = parseDollarsToCents(perTxCapDollars);
      const monthlyCents = parseDollarsToCents(monthlyLimitDollars);

      const res = await fetch("/api/payer/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          per_tx_cap: perTxCents,
          monthly_limit: monthlyCents,
        }),
      });

      if (!res.ok) throw new Error("Failed to save rules");
      showToast("Spending rules updated successfully!");
    } catch (err: any) {
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    setPausing(true);
    try {
      const endpoint = isSoftPaused ? "/api/payer/resume" : "/api/payer/pause";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pause action failed");

      setIsSoftPaused(Boolean(data.soft_paused));
      showToast(
        data.soft_paused
          ? "Payments paused! All new invoices will halt safely."
          : "Payments resumed! Normal automated processing active."
      );
    } catch (err: any) {
      alert(err.message || "Failed to update pause state");
    } finally {
      setPausing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-[#111C30] border border-[#34D399] text-[#E8EEF7] text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#E8EEF7]">Settings & Safeguards</h1>
        <p className="text-xs text-[#93A4BD] mt-0.5">
          Configure spending limits, permission lifespans, and emergency stops.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#93A4BD] flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>Loading settings...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Emergency Stop */}
          <div className="p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isSoftPaused
                      ? "bg-[#DC2626]/20 text-[#DC2626]"
                      : "bg-[#34D399]/20 text-[#34D399]"
                  }`}
                >
                  {isSoftPaused ? (
                    <PauseCircle className="w-5 h-5" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#E8EEF7]">
                    Autonomous Payment Switch
                  </h3>
                  <div className="text-xs text-[#93A4BD]">
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        isSoftPaused ? "text-[#DC2626]" : "text-[#34D399]"
                      }`}
                    >
                      {isSoftPaused ? "PAUSED" : "ACTIVE"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleTogglePause}
                disabled={pausing}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                  isSoftPaused
                    ? "bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220]"
                    : "bg-[#DC2626]/20 hover:bg-[#DC2626]/30 text-[#DC2626] border border-[#DC2626]/30"
                }`}
              >
                {pausing ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : isSoftPaused ? (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Resume Payments</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-4 h-4" />
                    <span>Pause Payments</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[#93A4BD] leading-relaxed">
              When paused, all incoming invoices halt immediately without funds leaving your custody account. You can safely resume at any time.
            </p>
          </div>

          {/* Section 2: Spending Rules */}
          <div className="p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E8EEF7] uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-[#34D399]" />
              <span>Spending Safeguards</span>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#93A4BD] mb-1.5">
                    Per-Payment Cap (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-xs text-[#93A4BD] font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={perTxCapDollars}
                      onChange={(e) => setPerTxCapDollars(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs font-bold text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                    />
                  </div>
                  <span className="text-[11px] text-[#5B6B82] mt-1 block">
                    Any single invoice above this triggers manual review.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#93A4BD] mb-1.5">
                    Monthly Budget Cap (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-xs text-[#93A4BD] font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={monthlyLimitDollars}
                      onChange={(e) => setMonthlyLimitDollars(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs font-bold text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                    />
                  </div>
                  <span className="text-[11px] text-[#5B6B82] mt-1 block">
                    Total allowable automated spend per calendar month.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#34D399]/10 disabled:opacity-50"
                >
                  {saving ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Spending Rules</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Permission Lifespan & Security */}
          <div className="p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E8EEF7] uppercase tracking-wider">
              <Lock className="w-4 h-4 text-[#34D399]" />
              <span>Permission Lifespan</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#93A4BD]">Enforcement:</span>
                <span className="font-semibold text-[#34D399]">
                  Smart Contract On-Chain Rules
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#93A4BD]">Expires:</span>
                <span className="text-[#E8EEF7]">
                  {expiresAt
                    ? new Date(expiresAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "90 days from activation"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#93A4BD]">Designated Asset:</span>
                <span className="text-[#E8EEF7]">USDT on NEAR (nep141)</span>
              </div>
            </div>

            <p className="text-[11px] text-[#5B6B82] leading-relaxed">
              Automated invoice payments can never exceed your pre-approved parameters or access any asset other than USDT. Permissions automatically terminate upon expiry.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
