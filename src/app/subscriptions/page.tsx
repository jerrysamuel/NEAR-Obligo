"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle,
  PauseCircle,
  XCircle,
  Filter,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, calculateMonthlyEquivalent, calculateAnnualCost, BillingCycle } from "@/lib/format";

interface SubscriptionItem {
  id: string;
  name: string;
  provider: string;
  category: string;
  amount: number;
  currency: string;
  billingCycle: "weekly" | "monthly" | "quarterly" | "yearly";
  nextBillingDate: string;
  status: "active" | "paused" | "cancelled";
  notes?: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    provider: "",
    category: "Developer Tools",
    amount: 5000,
    currency: "NGN",
    billingCycle: "monthly" as BillingCycle,
    nextBillingDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "active" as "active" | "paused" | "cancelled",
    notes: "",
  });

  async function loadSubscriptions() {
    try {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (json.success) {
        setSubscriptions(json.subscriptions);
      }
    } catch (err) {
      console.error("Error loading subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  function handleOpenCreate() {
    setEditingSub(null);
    setFormData({
      name: "",
      provider: "",
      category: "Developer Tools",
      amount: 5000,
      currency: "NGN",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      status: "active",
      notes: "",
    });
    setIsModalOpen(true);
  }

  function handleOpenEdit(sub: SubscriptionItem) {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      provider: sub.provider,
      category: sub.category,
      amount: sub.amount,
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate,
      status: sub.status,
      notes: sub.notes || "",
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingSub) {
        // Update
        const res = await fetch(`/api/subscriptions/${editingSub.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          loadSubscriptions();
        }
      } else {
        // Create
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          loadSubscriptions();
        }
      }
    } catch (err) {
      console.error("Failed to save subscription:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this subscription?")) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete subscription:", err);
    }
  }

  async function handleToggleStatus(sub: SubscriptionItem) {
    const nextStatus = sub.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === sub.id ? { ...s, status: nextStatus } : s))
        );
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  }

  // Filter subscriptions
  const filtered = subscriptions.filter((s) => {
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  // Calculate totals
  const totalMonthly = subscriptions
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.billingCycle), 0);

  const totalAnnual = subscriptions
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + calculateAnnualCost(s.amount, s.billingCycle), 0);

  const categories = Array.from(new Set(subscriptions.map((s) => s.category)));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            <span>Recurring Subscriptions</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track, audit, and normalize recurring SaaS, entertainment, and infrastructure costs.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Monthly Equivalent
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(totalMonthly)}
          </div>
          <span className="text-[11px] text-emerald-400">Normalized from all active cycles</span>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Annualized Run Rate
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(totalAnnual)}
          </div>
          <span className="text-[11px] text-cyan-400">Total 12-month commitment</span>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Subscriptions Count
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {subscriptions.filter((s) => s.status === "active").length} Active /{" "}
            {subscriptions.length} Total
          </div>
          <span className="text-[11px] text-indigo-400">Confidential local ledger</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table / List */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Service & Provider</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Billing Amount</th>
                <th className="px-6 py-4">Monthly Equivalent</th>
                <th className="px-6 py-4">Next Renewal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((sub) => {
                const monthlyEq = calculateMonthlyEquivalent(sub.amount, sub.billingCycle);
                return (
                  <tr key={sub.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{sub.name}</div>
                      <div className="text-xs text-slate-400">{sub.provider}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                        {sub.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-white">
                      {formatCurrency(sub.amount, sub.currency)}
                      <span className="text-xs text-slate-400 font-normal ml-1">
                        /{sub.billingCycle}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-emerald-400">
                      {formatCurrency(monthlyEq)}
                      <span className="text-[11px] text-slate-400 font-normal">/mo</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        {sub.nextBillingDate}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                          sub.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : sub.status === "paused"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {sub.status === "active" && <CheckCircle className="w-3 h-3" />}
                        {sub.status === "paused" && <PauseCircle className="w-3 h-3" />}
                        {sub.status === "cancelled" && <XCircle className="w-3 h-3" />}
                        {sub.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(sub)}
                        title={sub.status === "active" ? "Pause Subscription" : "Activate Subscription"}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
                      >
                        {sub.status === "active" ? (
                          <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        title="Edit Subscription"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        title="Delete Subscription"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingSub ? "Edit Subscription" : "Add New Subscription"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Service Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Netflix, Copilot"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Provider / Merchant</label>
                  <input
                    type="text"
                    required
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="e.g. Netflix Inc."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Design">Design</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Billing Cycle</label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) =>
                      setFormData({ ...formData, billingCycle: e.target.value as BillingCycle })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Amount (in NGN ₦)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Next Billing Date</label>
                  <input
                    type="date"
                    required
                    value={formData.nextBillingDate}
                    onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Notes (Private, never shared)</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. 4K Family plan, shared with brothers"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  {editingSub ? "Save Changes" : "Create Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
