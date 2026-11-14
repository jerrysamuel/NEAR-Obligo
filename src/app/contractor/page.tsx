"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatCents } from "@/lib/money";
import { getStatusPresentation } from "@/lib/copy";

interface ContractorContract {
  id: string;
  name: string;
  rate_cents: number;
  unit: string;
  frequency: string;
  max_amount: number;
}

interface ContractorInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
}

export default function ContractorHomePage() {
  const [vendorName, setVendorName] = useState("Contractor");
  const [paidThisMonthCents, setPaidThisMonthCents] = useState(0);
  const [contracts, setContracts] = useState<ContractorContract[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<ContractorInvoice[]>([]);

  useEffect(() => {
    const vendorId = window.sessionStorage.getItem("nearbligo_vendor_id");
    fetch(vendorId ? `/api/invoices?vendor_id=${encodeURIComponent(vendorId)}` : "/api/invoices")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.vendor_name) setVendorName(data.vendor_name);
        if (typeof data?.paid_this_month_cents === "number") {
          setPaidThisMonthCents(data.paid_this_month_cents);
        }
        if (Array.isArray(data?.contracts)) setContracts(data.contracts);
        if (Array.isArray(data?.invoices)) setRecentInvoices(data.invoices.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {/* Greeting & Summary */}
      <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-2">
        <div className="text-xs text-[#93A4BD] font-medium">Welcome back</div>
        <h1 className="text-lg font-bold text-[#E8EEF7]">{vendorName}</h1>
        <div className="pt-3 border-t border-[#22314A] flex items-center justify-between">
          <span className="text-xs text-[#93A4BD]">Paid this month:</span>
          <span className="text-base font-bold text-[#34D399]">
            {formatCents(paidThisMonthCents)}
          </span>
        </div>
      </div>

      {/* Action CTA */}
      <Link
        href="/contractor/invoices/new"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-sm transition-all shadow-md active:scale-98"
      >
        <PlusCircle className="w-5 h-5" />
        <span>Create new invoice</span>
      </Link>

      {/* Active Contracts Card List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#93A4BD] uppercase tracking-wider">
            Your Active Contracts
          </h2>
          <span className="text-[11px] text-[#93A4BD]">{contracts.length} active</span>
        </div>

        {contracts.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#111C30] border border-[#22314A] text-center text-xs text-[#93A4BD]">
            No active contracts assigned yet.
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#111C30] border border-[#22314A] flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-[#E8EEF7]">{c.name}</div>
                  <div className="text-[11px] text-[#93A4BD] mt-0.5">
                    {formatCents(c.rate_cents)} {c.unit ? `per ${c.unit}` : ""} ({c.frequency})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#93A4BD]">Limit</div>
                  <div className="text-xs font-bold text-[#E8EEF7]">
                    {formatCents(c.max_amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#93A4BD] uppercase tracking-wider">
            Recent Invoices
          </h2>
          <Link
            href="/contractor/invoices"
            className="text-[11px] text-[#34D399] hover:underline font-semibold"
          >
            See all
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#111C30] border border-[#22314A] text-center text-xs text-[#93A4BD]">
            No invoices submitted yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => {
              const pres = getStatusPresentation(inv.status);
              return (
                <Link
                  key={inv.id}
                  href={`/contractor/invoices/${inv.id}`}
                  className="p-3.5 rounded-xl bg-[#111C30] border border-[#22314A] flex items-center justify-between hover:border-[#34D399]/40 transition-colors block"
                >
                  <div>
                    <div className="font-semibold text-xs text-[#E8EEF7]">
                      {inv.invoice_number || "Invoice"}
                    </div>
                    <div className="text-[10px] text-[#93A4BD] mt-0.5">Due {inv.due_date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-[#E8EEF7]">
                      {formatCents(inv.amount)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pres.className}`}
                    >
                      {pres.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
