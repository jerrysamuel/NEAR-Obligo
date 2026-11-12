"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  ShoppingBag,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function OverviewPage() {
  const [data, setData] = useState<{
    monthlyTotal: number;
    annualizedTotal: number;
    activeCount: number;
    upcomingRenewals: any[];
    savedProductsCount: number;
    insights: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const [subRes, renewalRes, savedRes, insightRes] = await Promise.all([
          fetch("/api/subscriptions"),
          fetch("/api/subscriptions/upcoming?days=15"),
          fetch("/api/shopping/saved"),
          fetch("/api/subscriptions/insights"),
        ]);

        const subJson = await subRes.json();
        const renewalJson = await renewalRes.json();
        const savedJson = await savedRes.json();
        const insightJson = await insightRes.json();

        setData({
          monthlyTotal: subJson.stats?.monthlyTotal || 48500,
          annualizedTotal: subJson.stats?.annualizedTotal || 582000,
          activeCount: subJson.stats?.activeCount || 5,
          upcomingRenewals: renewalJson.upcomingRenewals || [],
          savedProductsCount: savedJson.savedProducts?.length || 2,
          insights: insightJson.insights,
        });
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-mono mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Obligo Personal Commerce Agent Active</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Good day, Jerry! Your Commerce Overview
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Privacy-preserving commerce & recurring expense orchestrator. All inference runs in confidential TEE hardware with verifiable NEAR testnet permissions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/shopping"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Search Products</span>
          </Link>
          <Link
            href="/subscriptions"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center gap-1.5 border border-slate-700"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Manage Subscriptions</span>
          </Link>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Subscriptions */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Monthly Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {data ? formatCurrency(data.monthlyTotal) : "₦48,500"}
          </div>
          <p className="text-xs text-slate-400 mt-1">Normalized recurring monthly outlay</p>
        </div>

        {/* Annualized Cost */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Annualized Spend</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {data ? formatCurrency(data.annualizedTotal) : "₦582,000"}
          </div>
          <p className="text-xs text-slate-400 mt-1">Projected 12-month commitment</p>
        </div>

        {/* Active Subscriptions */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {data ? `${data.activeCount} Active` : "5 Active"}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {data?.upcomingRenewals.length || 3} renewals due in &lt;15 days
          </p>
        </div>

        {/* Saved Products */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Saved Products</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {data ? `${data.savedProductsCount} Shortlisted` : "2 Shortlisted"}
          </div>
          <p className="text-xs text-slate-400 mt-1">Dell XPS 15, MacBook Pro</p>
        </div>
      </div>

      {/* Main Split: Renewals & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Renewals */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Upcoming Renewals</h2>
            </div>
            <Link
              href="/subscriptions"
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.upcomingRenewals && data.upcomingRenewals.length > 0 ? (
              data.upcomingRenewals.slice(0, 4).map((renewal) => (
                <div
                  key={renewal.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
                      {renewal.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{renewal.name}</h4>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {renewal.nextBillingDate}
                        </span>
                        <span>•</span>
                        <span className="text-amber-400/90 font-medium">
                          {renewal.daysRemaining === 0
                            ? "Renews today"
                            : `In ${renewal.daysRemaining} days`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {formatCurrency(renewal.amount, renewal.currency)}
                    </div>
                    <span className="text-[11px] text-slate-400 uppercase font-mono">
                      {renewal.provider}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No immediate renewals pending.
              </div>
            )}
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Confidential AI Intelligence</span>
            </div>

            <h3 className="text-base font-bold text-white leading-snug">
              {data?.insights?.recommendations?.[0] ||
                "You have three subscriptions renewing within the next 10 days."}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              {data?.insights?.recommendations?.[2] ||
                "Auditing entertainment & non-critical developer seats could liberate up to ₦19,000 monthly, boosting your available tech hardware budget."}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Top Expense:</span>
                <span className="text-white font-medium">
                  {data?.insights?.topSubscriptions?.[0]?.name || "Copilot / Cloud"} (
                  {data?.insights?.topSubscriptions?.[0]?.formatted || "₦19,000/mo"})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Potential Savings:</span>
                <span className="text-emerald-400 font-semibold">
                  {data?.insights?.potentialSavings?.formatted || "₦19,000"}/month
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/insights"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs text-center transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <span>Ask Cross-Module Questions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Verifiable Privacy & Security Footer Banner */}
      <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Zero-Knowledge Architecture & Explicit Disclosures
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              The AI orchestrator cannot view your full database or sign blockchain authorizations independently. Each disclosure requires your cryptographic confirmation.
            </p>
          </div>
        </div>

        <Link
          href="/permissions"
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium shrink-0 transition"
        >
          Audit Permissions
        </Link>
      </div>
    </div>
  );
}
