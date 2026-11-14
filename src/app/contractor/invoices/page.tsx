"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCw,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatCents } from "@/lib/money";

interface InvoiceItem {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  created_at: string;
  obligations?: {
    name: string;
  };
}

export default function ContractorInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "settled" | "in_review">("all");

  const loadInvoices = async () => {
    try {
      const res = await fetch("/api/vendor/invoices");
      const data = await res.json();
      if (Array.isArray(data.invoices)) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "settled") return inv.status === "settled";
    if (filter === "in_review")
      return inv.status === "needs_approval" || inv.status === "verified";
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#34D399]/15 text-[#34D399]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Paid</span>
          </span>
        );
      case "needs_approval":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#D97706]/15 text-[#D97706]">
            <Clock className="w-3 h-3" />
            <span>In Review</span>
          </span>
        );
      case "refused":
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#DC2626]/15 text-[#DC2626]">
            <XCircle className="w-3 h-3" />
            <span>Declined</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#22314A] text-[#93A4BD]">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EEF7]">My Invoices</h1>
          <p className="text-xs text-[#93A4BD] mt-0.5">
            Track submitted invoices and disbursement statuses.
          </p>
        </div>
        <Link
          href="/contractor/invoices/new"
          className="px-3.5 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[#111C30] border border-[#22314A] text-xs font-semibold">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filter === "all"
              ? "bg-[#22314A] text-[#E8EEF7]"
              : "text-[#93A4BD] hover:text-[#E8EEF7]"
          }`}
        >
          All ({invoices.length})
        </button>
        <button
          onClick={() => setFilter("settled")}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filter === "settled"
              ? "bg-[#22314A] text-[#E8EEF7]"
              : "text-[#93A4BD] hover:text-[#E8EEF7]"
          }`}
        >
          Paid ({invoices.filter((i) => i.status === "settled").length})
        </button>
        <button
          onClick={() => setFilter("in_review")}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filter === "in_review"
              ? "bg-[#22314A] text-[#E8EEF7]"
              : "text-[#93A4BD] hover:text-[#E8EEF7]"
          }`}
        >
          In Review ({invoices.filter((i) => i.status === "needs_approval").length})
        </button>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[#93A4BD] flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>Loading invoices...</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#111C30] border border-[#22314A] text-center space-y-3">
          <FileText className="w-8 h-8 text-[#93A4BD] mx-auto opacity-50" />
          <p className="text-xs text-[#93A4BD]">No invoices found in this view.</p>
          <Link
            href="/contractor/invoices/new"
            className="inline-block px-4 py-2 rounded-xl bg-[#34D399] text-[#0A1220] font-bold text-xs"
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/contractor/invoices/${inv.id}`}
              className="block p-4 rounded-2xl bg-[#111C30] border border-[#22314A] hover:border-[#34D399]/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[#E8EEF7]">
                    #{inv.invoice_number || inv.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-[#93A4BD] mt-0.5">
                    {inv.obligations?.name || "Services"} &bull;{" "}
                    {new Date(inv.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="font-bold text-sm text-[#E8EEF7]">
                      {formatCents(inv.amount)} USD
                    </div>
                    <div className="mt-1">{getStatusBadge(inv.status)}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#93A4BD]" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
