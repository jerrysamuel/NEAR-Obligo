"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, UserPlus, Wallet } from "lucide-react";
import { formatCents } from "@/lib/money";

interface DashboardData {
  available_funds_cents: number;
  paid_this_month_cents: number;
  monthly_limit_cents: number;
  pending_approvals_count: number;
  recent_activity: Array<{ id: string; message: string; time: string }>;
}

export default function PayerHomePage() {
  const [data, setData] = useState<DashboardData>({
    available_funds_cents: 0,
    paid_this_month_cents: 0,
    monthly_limit_cents: 0,
    pending_approvals_count: 0,
    recent_activity: [],
  });

  useEffect(() => {
    let active = true;
    const loadFunds = () => {
      fetch("/api/payer/funds", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (active && json) setData((previous) => ({ ...previous, ...json }));
        })
        .catch(() => {});
    };
    loadFunds();
    const refreshTimer = window.setInterval(loadFunds, 10000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const progress = data.monthly_limit_cents > 0
    ? Math.min(100, Math.round((data.paid_this_month_cents / data.monthly_limit_cents) * 100))
    : 0;

  return (
    <div className="ledger-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Clearinghouse / payer ledger</p>
          <h1 className="serif-title mt-1 text-3xl text-[var(--text-primary)]">Accounts payable overview</h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Policy-controlled contractor settlement on NEAR mainnet.</p>
        </div>
        <Link href="/payer/vendors" className="ledger-button inline-flex items-center gap-2 px-3 py-2 text-xs font-bold">
          <UserPlus className="h-4 w-4" /> Invite contractor
        </Link>
      </header>

      <section className="ledger-strip" aria-label="Treasury summary">
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Treasury available</p>
          <p className="mono mt-2 text-2xl font-semibold tabular-nums">{formatCents(data.available_funds_cents)}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]"><Wallet className="mr-1 inline h-3 w-3" />Ready for settlement</p>
        </div>
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Agent spend / month</p>
          <p className="mono mt-2 text-2xl font-semibold tabular-nums">{formatCents(data.paid_this_month_cents)} <span className="text-sm text-[var(--text-muted)]">/ {formatCents(data.monthly_limit_cents)}</span></p>
          <div className="mt-2 h-1 bg-[var(--bg-subtle)]"><div className="h-full bg-[var(--status-settled)]" style={{ width: `${progress}%` }} /></div>
        </div>
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Exceptions queue</p>
          <p className={`mono mt-2 text-2xl font-semibold tabular-nums ${data.pending_approvals_count ? "status-policy-hold" : "status-settled"}`}>{data.pending_approvals_count}</p>
          <Link href="/payer/approvals" className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--accent-primary)]">Review approvals <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </section>

      <section className="ledger-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-4 py-3">
          <div>
            <p className="mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Settlement journal</p>
            <h2 className="serif-title text-xl">Recent activity</h2>
          </div>
          <Link href="/payer/invoices" className="text-xs font-semibold text-[var(--accent-primary)]">View ledger</Link>
        </div>
        {data.recent_activity.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-[var(--text-muted)]">No settlement entries yet. Invite a contractor to open the ledger.</div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)]">
            {data.recent_activity.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 text-xs">
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-[var(--status-settled)]" />{item.message}</span>
                <span className="mono text-[10px] text-[var(--text-muted)]">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]"><Clock className="h-3 w-3" />All timestamps shown in local ledger time; transaction receipts include UTC.</p>
    </div>
  );
}
