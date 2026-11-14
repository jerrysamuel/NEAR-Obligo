"use client";

import { useEffect, useState } from "react";
import {
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Save,
  Coins,
  RefreshCw,
  Lock,
  AlertTriangle,
} from "lucide-react";

export default function SpendingPoliciesPage() {
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadPolicy() {
    try {
      const res = await fetch("/api/payer/policy");
      const json = await res.json();
      if (json.success) setPolicy(json.policy);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicy();
  }, []);

  function handleNumericChange(field: string, rawVal: string, minVal: number = 1) {
    // Strip leading zeroes and non-digits
    const sanitized = rawVal.replace(/^0+(?=\d)/, "").replace(/[^0-9.]/g, "");
    const num = sanitized === "" ? 0 : parseFloat(sanitized);
    setPolicy((prev: any) => ({
      ...prev,
      [field]: num,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!policy) return;

    if (!policy.maximum_transaction || policy.maximum_transaction < 1) {
      setErrorMsg("Maximum per-transaction limit must be at least $1.00");
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/payer/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });

      const json = await res.json();
      if (json.success) {
        setPolicy(json.policy);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 5000);
      } else {
        setErrorMsg(json.error || "Failed to update spending policy");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reach policy engine");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !policy) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center text-slate-400 text-sm">
        Loading spending policy engine...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Deterministic Safeguards
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
            obligoo.near
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Spending Policies & Permission Bounds
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure payment limits. Automated invoice settlement operates strictly within these boundaries.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-2.5 text-sm font-medium animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Payment policy saved and anchored to the configured NEAR contract.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 flex items-center gap-2.5 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Spending Limits */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-slate-800 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Hard Budget Limits (USD)
            </h2>
            <span className="text-xs text-slate-400">Strictly enforced by code & NEAR contract</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Max Per Transaction ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500 text-sm font-semibold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={policy.maximum_transaction === 0 ? "" : policy.maximum_transaction}
                  placeholder="100"
                  onChange={(e) => handleNumericChange("maximum_transaction", e.target.value, 1)}
                  className="w-full bg-[#0A0D14] border border-slate-700/80 rounded-xl pl-8 pr-4 py-3 text-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1.5 block">
                Single purchases above this amount will be rejected
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Daily Spending Limit ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500 text-sm font-semibold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={policy.daily_spending_limit === 0 ? "" : policy.daily_spending_limit}
                  placeholder="300"
                  onChange={(e) => handleNumericChange("daily_spending_limit", e.target.value, 1)}
                  className="w-full bg-[#0A0D14] border border-slate-700/80 rounded-xl pl-8 pr-4 py-3 text-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1.5 block">
                Total aggregate spend cap per 24 hours
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Monthly Spending Limit ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500 text-sm font-semibold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={policy.monthly_spending_limit === 0 ? "" : policy.monthly_spending_limit}
                  placeholder="1000"
                  onChange={(e) => handleNumericChange("monthly_spending_limit", e.target.value, 1)}
                  className="w-full bg-[#0A0D14] border border-slate-700/80 rounded-xl pl-8 pr-4 py-3 text-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1.5 block">
                Total aggregate spend cap per calendar month
              </span>
            </div>
          </div>
        </div>

        {/* Product & Review Preferences */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-slate-800 space-y-5 shadow-xl">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
          Invoice Review Rules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Minimum variance tolerance (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={policy.product_preferences.minimum_rating}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    product_preferences: {
                      ...policy.product_preferences,
                      minimum_rating: Math.max(1, Math.min(5, parseFloat(e.target.value) || 1)),
                    },
                  })
                }
                className="w-full bg-[#0A0D14] border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Minimum supporting records
              </label>
              <input
                type="number"
                min="1"
                value={policy.product_preferences.minimum_review_count}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    product_preferences: {
                      ...policy.product_preferences,
                      minimum_review_count: Math.max(1, parseInt(e.target.value) || 1),
                    },
                  })
                }
                className="w-full bg-[#0A0D14] border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={policy.product_preferences.consider_verified_reviews}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    product_preferences: {
                      ...policy.product_preferences,
                      consider_verified_reviews: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              Require supporting records before automated settlement
            </label>

            <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={policy.merchant_preferences.exclude_unsupported_merchants}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    merchant_preferences: {
                      ...policy.merchant_preferences,
                      exclude_unsupported_merchants: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              Require verified contractor payout accounts
            </label>
          </div>
        </div>

        {/* Autonomous Execution Toggle */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <div className="text-base font-bold text-white">Autonomous Execution Permitted</div>
            <p className="text-xs text-slate-400">
              When active, the agent can execute checkouts automatically when all spending limits and eligibility criteria pass.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={policy.autonomous_execution}
              onChange={(e) => setPolicy({ ...policy, autonomous_execution: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* On-Chain Record Details */}
        <div className="p-5 rounded-2xl bg-[#0A0D14] border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-purple-400 font-semibold">
            <Coins className="w-4 h-4" />
            NEAR Blockchain Cryptographic Anchor
          </div>
          <div className="text-slate-400">
            Contract: <span className="text-cyan-400 font-mono font-medium">obligoo.near</span>
          </div>
          {policy.near_permission_hash && (
            <div className="text-slate-400">
              Active Permission Hash:{" "}
              <span className="font-mono text-emerald-400 break-all">{policy.near_permission_hash}</span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Anchoring on NEAR...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Spending Policy
            </>
          )}
        </button>
      </form>
    </div>
  );
}
