"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ArrowRight, CheckCircle2, Clock3, XCircle } from "lucide-react";

export default function InvoiceHistoryPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => setInvoices(data.invoices || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Auditable settlement record
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white mt-3">Invoice History</h1>
        <p className="text-sm text-slate-400 mt-1">Review submitted, approved, refused, and settled invoices.</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading invoice records...</div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <FileText className="w-8 h-8 mx-auto text-slate-500" />
          <p className="text-sm text-slate-300">No invoices have been submitted yet.</p>
          <Link href="/contractor/invoices/new" className="inline-flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            Submit an invoice <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {invoices.map((invoice) => {
              const status = String(invoice.status || "unknown");
              const Icon = status === "settled" ? CheckCircle2 : status === "refused" ? XCircle : Clock3;
              return (
                <Link key={invoice.id} href={`/receipt/${invoice.id}`} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${status === "settled" ? "text-emerald-400" : status === "refused" ? "text-red-400" : "text-amber-400"}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{invoice.invoice_number || invoice.id}</div>
                      <div className="text-xs text-slate-500">{invoice.due_date || "No due date"} · {status.replace("_", " ")}</div>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-emerald-400">${(Number(invoice.amount || 0) / 100).toFixed(2)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
