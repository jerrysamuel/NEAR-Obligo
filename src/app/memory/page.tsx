"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Shield,
  Save,
  Plus,
  Trash2,
  DollarSign,
  Tag,
  Store,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function MemoryPage() {
  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [monthlyBudget, setMonthlyBudget] = useState(1500000);
  const [spendingLimit, setSpendingLimit] = useState(1300000);
  const [brandInput, setBrandInput] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [merchantInput, setMerchantInput] = useState("");
  const [merchants, setMerchants] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [approvalRequirements, setApprovalRequirements] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, prefRes] = await Promise.all([
          fetch("/api/memory/profile"),
          fetch("/api/memory/preferences"),
        ]);
        const profJson = await profRes.json();
        const prefJson = await prefRes.json();

        if (profJson.success) {
          setProfile(profJson.profile);
          setMonthlyBudget(profJson.profile.monthlyBudget || 1500000);
        }
        if (prefJson.success) {
          setPreferences(prefJson.preferences);
          setSpendingLimit(prefJson.preferences.spendingLimit || 1300000);
          setBrands(prefJson.preferences.preferredBrands || []);
          setMerchants(prefJson.preferences.preferredMerchants || []);
          setRestrictions(prefJson.preferences.shoppingRestrictions || []);
          setApprovalRequirements(
            prefJson.preferences.approvalRequirements ||
              "Explicit user approval required before disclosing recipient name, phone or address"
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function handleAddBrand() {
    if (!brandInput.trim()) return;
    setBrands((prev) => [...prev, brandInput.trim()]);
    setBrandInput("");
  }

  function handleRemoveBrand(idx: number) {
    setBrands((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAddMerchant() {
    if (!merchantInput.trim()) return;
    setMerchants((prev) => [...prev, merchantInput.trim()]);
    setMerchantInput("");
  }

  function handleRemoveMerchant(idx: number) {
    setMerchants((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAddRestriction() {
    if (!restrictionInput.trim()) return;
    setRestrictions((prev) => [...prev, restrictionInput.trim()]);
    setRestrictionInput("");
  }

  function handleRemoveRestriction(idx: number) {
    setRestrictions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveAll() {
    setSaving(true);
    setSavedSuccess(false);

    try {
      await Promise.all([
        fetch("/api/memory/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthlyBudget }),
        }),
        fetch("/api/memory/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferredBrands: brands,
            preferredMerchants: merchants,
            shoppingRestrictions: restrictions,
            spendingLimit,
            approvalRequirements,
          }),
        }),
      ]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            <span>Private User Memory</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Personal boundaries, shopping criteria, and financial constraints stored client-side under your sovereignty.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
        >
          {saving ? (
            <span className="animate-spin">◌</span>
          ) : savedSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{savedSuccess ? "Saved Successfully!" : "Save Memory"}</span>
        </button>
      </div>

      {/* Financial Limits Section */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Financial Preferences & Spending Limits</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Monthly General Commerce Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₦</span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pl-8 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-[11px] text-slate-400">
              Evaluated against recurring subscriptions for cashflow safety
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Per-Device Purchase Limit</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₦</span>
              <input
                type="number"
                value={spendingLimit}
                onChange={(e) => setSpendingLimit(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pl-8 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-[11px] text-slate-400">
              Agent filters out items exceeding this cap unless instructed
            </span>
          </div>
        </div>
      </div>

      {/* Shopping Preferences Section */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 shadow-xl text-xs">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Tag className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Shopping Criteria & Brand Preferences</h2>
        </div>

        {/* Preferred Brands */}
        <div className="space-y-2">
          <label className="text-slate-400 font-medium">Preferred Hardware Brands</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
              placeholder="e.g. Apple, Dell, Lenovo, Framework"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleAddBrand}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {brands.map((b, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5"
              >
                <span>{b}</span>
                <button
                  onClick={() => handleRemoveBrand(i)}
                  className="text-slate-500 hover:text-red-400"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preferred Merchants */}
        <div className="space-y-2">
          <label className="text-slate-400 font-medium">Trusted Merchants</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={merchantInput}
              onChange={(e) => setMerchantInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMerchant()}
              placeholder="e.g. Slot Systems, Konga Tech, Jumia Express"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleAddMerchant}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {merchants.map((m, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5"
              >
                <span>{m}</span>
                <button
                  onClick={() => handleRemoveMerchant(i)}
                  className="text-slate-500 hover:text-red-400"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Shopping Restrictions */}
        <div className="space-y-2">
          <label className="text-slate-400 font-medium">Shopping Restrictions & Safeguards</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={restrictionInput}
              onChange={(e) => setRestrictionInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRestriction()}
              placeholder="e.g. No refurbished units without 1-year warranty"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleAddRestriction}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {restrictions.map((r, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 flex items-center gap-1.5"
              >
                <span>{r}</span>
                <button
                  onClick={() => handleRemoveRestriction(i)}
                  className="text-slate-500 hover:text-red-400"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Approval Requirements */}
        <div className="space-y-2">
          <label className="text-slate-400 font-medium">
            Authorization & Disclosure Instructions
          </label>
          <textarea
            rows={2}
            value={approvalRequirements}
            onChange={(e) => setApprovalRequirements(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
          ></textarea>
        </div>
      </div>
    </div>
  );
}
