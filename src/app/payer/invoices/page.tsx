"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCw,
  Search,
  Filter,
  X,
  ShieldCheck,
  Receipt,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { formatCents } from "@/lib/money";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  refusal_reason?: string;
  wallet_address: string;
  created_at: string;
  vendors?: {
    id: string;
    name: string;
  };
  obligations?: {
    name: string;
    rate_cents: number;
    unit: string;
  };
}

interface AuditLogRow {
  id: string;
  actor: string;
  action: string;
  decision?: string;
  reason?: string;
  created_at: string;
}

export default function PayerInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const loadInvoices = async () => {
    try {
      const res = await fetch("/api/vendor/invoices");
      const data = await res.json();
      if (Array.isArray(data.invoices)) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const openDrawer = async (inv: InvoiceRow) => {
    setSelectedInvoice(inv);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payer/invoices/${selectedInvoice.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      showToast(`Invoice #${selectedInvoice.invoice_number} approved and settled!`);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedInvoice) return;
    const reason = prompt("Enter reason for rejection:") || "REJECTED_BY_PAYER";
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payer/invoices/${selectedInvoice.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");

      showToast(`Invoice #${selectedInvoice.invoice_number} declined.`);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const numMatch = inv.invoice_number?.toLowerCase().includes(q);
      const vendorMatch = inv.vendors?.name?.toLowerCase().includes(q);
      return numMatch || vendorMatch;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#16A34A]/10 dark:bg-[#34D399]/15 text-[#16A34A] dark:text-[#34D399]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Settled</span>
          </span>
        );
      case "needs_approval":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#D97706]/10 dark:bg-[#D97706]/15 text-[#D97706]">
            <Clock className="w-3 h-3" />
            <span>Needs Approval</span>
          </span>
        );
      case "refused":
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#DC2626]/10 dark:bg-[#DC2626]/15 text-[#DC2626]">
            <XCircle className="w-3 h-3" />
            <span>Refused</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E2E8F0] dark:bg-[#22314A] text-[#5B6B82] dark:text-[#93A4BD]">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-white dark:bg-[#111C30] border border-[#10B981] dark:border-[#34D399] text-[#0B1F3A] dark:text-[#E8EEF7] text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] dark:text-[#34D399]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0B1F3A] dark:text-[#E8EEF7]">Invoices</h1>
        <p className="text-xs text-[#5B6B82] dark:text-[#93A4BD] mt-0.5">
          Audited stream of contractor invoices and automated payment decisions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5B6B82] dark:text-[#93A4BD] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice # or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#111C30] border border-[#E2E8F0] dark:border-[#22314A] text-xs text-[#0B1F3A] dark:text-[#E8EEF7] placeholder-[#93A4BD] dark:placeholder-[#5B6B82] focus:outline-none focus:border-[#10B981] dark:focus:border-[#34D399] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#111C30] border border-[#E2E8F0] dark:border-[#22314A] text-xs text-[#0B1F3A] dark:text-[#E8EEF7] focus:outline-none focus:border-[#10B981] dark:focus:border-[#34D399] shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="settled">Settled</option>
            <option value="needs_approval">Needs Approval</option>
            <option value="refused">Refused</option>
            <option value="verified">Processing</option>
          </select>

          <button
            onClick={loadInvoices}
            className="p-2.5 rounded-xl bg-white dark:bg-[#111C30] border border-[#E2E8F0] dark:border-[#22314A] text-[#5B6B82] dark:text-[#93A4BD] hover:text-[#10B981] dark:hover:text-[#34D399] transition-colors shadow-xs"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#5B6B82] dark:text-[#93A4BD] flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#10B981] dark:text-[#34D399]" />
          <span>Loading ledger invoices...</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#111C30] border border-[#E2E8F0] dark:border-[#22314A] text-center space-y-2 shadow-xs">
          <FileText className="w-8 h-8 text-[#5B6B82] dark:text-[#93A4BD] mx-auto opacity-50" />
          <h2 className="text-sm font-bold text-[#0B1F3A] dark:text-[#E8EEF7]">No invoices found</h2>
          <p className="text-xs text-[#5B6B82] dark:text-[#93A4BD]">No invoices match your current filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-[#E2E8F0] dark:border-[#22314A] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FC] dark:bg-[#0A1220] border-b border-[#E2E8F0] dark:border-[#22314A] text-[#5B6B82] dark:text-[#93A4BD] font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#22314A]">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => openDrawer(inv)}
                    className="hover:bg-[#F1F5F9] dark:hover:bg-[#162238] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0B1F3A] dark:text-[#E8EEF7]">
                      {inv.invoice_number || inv.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 text-[#0B1F3A] dark:text-[#E8EEF7] font-medium">
                      {inv.vendors?.name || "Unknown contractor"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0B1F3A] dark:text-[#E8EEF7]">
                      {formatCents(inv.amount)} USD
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-4 text-[#5B6B82] dark:text-[#93A4BD]">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="text-[#5B6B82] dark:text-[#93A4BD] hover:text-[#10B981] dark:hover:text-[#34D399]">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRAWER / DETAILS MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-[#0A1220]/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-[#111C30] border-l border-[#E2E8F0] dark:border-[#22314A] h-full p-6 space-y-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#22314A] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#E8EEF7]">
                  Invoice #{selectedInvoice.invoice_number}
                </h3>
                <p className="text-xs text-[#5B6B82] dark:text-[#93A4BD]">
                  {selectedInvoice.vendors?.name || "Contractor"}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-[#5B6B82] dark:text-[#93A4BD] hover:text-[#0B1F3A] dark:hover:text-[#E8EEF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview Card */}
            <div className="p-4 rounded-xl bg-[#F7F9FC] dark:bg-[#0A1220] border border-[#E2E8F0] dark:border-[#22314A] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5B6B82] dark:text-[#93A4BD]">Total Amount:</span>
                <span className="font-bold text-[#10B981] dark:text-[#34D399]">
                  {formatCents(selectedInvoice.amount)} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6B82] dark:text-[#93A4BD]">Status:</span>
                <span>{getStatusBadge(selectedInvoice.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6B82] dark:text-[#93A4BD]">Contract:</span>
                <span className="text-[#0B1F3A] dark:text-[#E8EEF7]">
                  {selectedInvoice.obligations?.name || "Logistics Agreement"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6B82] dark:text-[#93A4BD]">Payout Account:</span>
                <span className="font-mono text-[#10B981] dark:text-[#34D399]">
                  {selectedInvoice.wallet_address}
                </span>
              </div>
            </div>

            {/* If needs approval: Action Buttons */}
            {selectedInvoice.status === "needs_approval" && (
              <div className="p-4 rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 space-y-3">
                <div className="flex items-center gap-2 text-xs text-[#D97706] font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Invoice exceeds contracted auto-pay limit</span>
                </div>
                <p className="text-[11px] text-[#5B6B82] dark:text-[#93A4BD] leading-relaxed">
                  You can approve this invoice to disburse the funds directly, or decline to cancel it.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#10B981] dark:bg-[#34D399] hover:bg-[#10B981]/90 dark:hover:bg-[#34D399]/90 text-white dark:text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    {actionLoading ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Approve & Disburse</span>
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 rounded-xl bg-[#E2E8F0] dark:bg-[#22314A] hover:bg-[#DC2626]/20 text-[#DC2626] text-xs font-semibold transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* If settled: Link to Receipt */}
            {selectedInvoice.status === "settled" && (
              <Link
                href={`/receipt/${selectedInvoice.id}`}
                className="w-full py-2.5 rounded-xl bg-[#10B981]/10 dark:bg-[#34D399]/15 text-[#10B981] dark:text-[#34D399] border border-[#10B981]/30 dark:border-[#34D399]/30 text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#10B981]/20 dark:hover:bg-[#34D399]/25 transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span>View Remittance Receipt</span>
              </Link>
            )}

            {/* Audit Log Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-[#E8EEF7] uppercase tracking-wider">
                Audit Timeline
              </h4>

              {drawerLoading ? (
                <div className="p-4 text-center text-xs text-[#5B6B82] dark:text-[#93A4BD] flex items-center justify-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin text-[#10B981] dark:text-[#34D399]" />
                  <span>Loading audit log...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F7F9FC] dark:bg-[#0A1220] border border-[#E2E8F0] dark:border-[#22314A] text-xs text-[#5B6B82] dark:text-[#93A4BD] text-center">
                  No audit log entries recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#F7F9FC] dark:bg-[#0A1220] border border-[#E2E8F0] dark:border-[#22314A] space-y-1 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#0B1F3A] dark:text-[#E8EEF7]">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-[#5B6B82] dark:text-[#93A4BD]">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5B6B82] dark:text-[#93A4BD]">
                        Actor: <span className="font-mono text-[#10B981] dark:text-[#34D399]">{log.actor}</span> &bull; Decision: <span className="font-semibold">{log.decision || "N/A"}</span>
                      </div>
                      {log.reason && (
                        <div className="text-[11px] text-[#5B6B82] italic">
                          {log.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
