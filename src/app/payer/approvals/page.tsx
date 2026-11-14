"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  X,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { formatCents } from "@/lib/money";

interface PendingVendor {
  id: string;
  name: string;
  wallet_address: string;
  category: string;
  status: string;
}

interface PendingInvoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  amount: number;
  expected_amount: number;
  due_date: string;
  status: string;
  refusal_reason?: string;
}

export default function PayerApprovalsPage() {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // M5 Modal state
  const [approvingVendor, setApprovingVendor] = useState<PendingVendor | null>(null);
  const [signing, setSigning] = useState(false);
  const [correlationId, setCorrelationId] = useState("");
  const [previewSummary, setPreviewSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const loadApprovals = async () => {
    try {
      // Load pending vendors
      const vRes = await fetch("/api/payer/vendors");
      const vData = await vRes.json();
      if (Array.isArray(vData.vendors)) {
        setVendors(vData.vendors.filter((v: any) => v.status === "pending_approval"));
      }

      // Load invoices waiting for review
      const iRes = await fetch("/api/invoices");
      const iData = await iRes.json();
      if (Array.isArray(iData.invoices)) {
        setInvoices(iData.invoices.filter((inv: any) => inv.status === "needs_approval"));
      }
    } catch (err) {
      console.error("Load approvals error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // M5: Trigger prepare vendor approval
  const handleOpenApproveModal = async (vendor: PendingVendor) => {
    setApprovingVendor(vendor);
    setErrorMsg("");
    setSigning(true);
    try {
      const res = await fetch(`/api/payer/vendors/${vendor.id}/approve/prepare`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare approval");
      setCorrelationId(data.correlation_id);
      setPreviewSummary(
        data.preview?.summary ||
          `Approve ${vendor.name} to receive payments at ${vendor.wallet_address}.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSigning(false);
    }
  };

  // M5: Submit signed approval
  const handleConfirmApprove = async () => {
    if (!approvingVendor) return;
    setSigning(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/payer/vendors/${approvingVendor.id}/approve/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correlation_id: correlationId,
          signed_data: { standard: "nep413", payload: { nonce: Date.now() } },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve vendor");

      setApprovingVendor(null);
      showToast(`${approvingVendor.name} approved! Added to allowed destinations.`);
      loadApprovals();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSigning(false);
    }
  };

  // Decline vendor
  const handleDeclineVendor = async (vendorId: string) => {
    try {
      await fetch(`/api/payer/vendors/${vendorId}/decline`, { method: "POST" });
      showToast("Vendor declined.");
      loadApprovals();
    } catch (err) {
      console.error("Decline error:", err);
    }
  };

  const maskAccount = (acc: string) => {
    if (!acc || acc === "unassigned.near") return "Unassigned";
    if (acc.length <= 8) return acc;
    return `${acc.slice(0, 4)}...${acc.slice(-4)}`;
  };

  const totalWaiting = vendors.length + invoices.length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-[#111C30] border border-[#34D399] text-[#E8EEF7] text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#E8EEF7]">Approvals</h1>
        <p className="text-xs text-[#93A4BD] mt-0.5">
          Review new vendor payout details and invoices that exceed contracted limits.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[#93A4BD] flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>Checking approvals...</span>
        </div>
      ) : totalWaiting === 0 ? (
        <div className="p-12 rounded-2xl bg-[#111C30] border border-[#22314A] text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#34D399] mx-auto" />
          <h2 className="text-sm font-bold text-[#E8EEF7]">Nothing waiting for you</h2>
          <p className="text-xs text-[#93A4BD]">All invoices and contractors are up to date.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Vendors Waiting for Approval */}
          {vendors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D97706] uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>Vendors Waiting for Your Approval ({vendors.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendors.map((v) => (
                  <div
                    key={v.id}
                    className="p-5 rounded-2xl bg-[#111C30] border border-[#D97706]/30 space-y-4"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-[#E8EEF7]">
                        {v.name} wants to be paid
                      </h3>
                      <p className="text-xs text-[#93A4BD] mt-1">
                        Contractor submitted payout account:{" "}
                        <span className="font-mono font-semibold text-[#34D399]">
                          {maskAccount(v.wallet_address)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#22314A]">
                      <button
                        onClick={() => handleOpenApproveModal(v)}
                        className="flex-1 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve vendor</span>
                      </button>
                      <button
                        onClick={() => handleDeclineVendor(v.id)}
                        className="px-4 py-2 rounded-xl bg-[#22314A] hover:bg-[#DC2626]/20 text-[#93A4BD] hover:text-[#DC2626] text-xs font-semibold transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Invoices Waiting for Approval */}
          {invoices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D97706] uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>Invoices Over Contract Limit ({invoices.length})</span>
              </div>

              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#E8EEF7]">
                        {inv.vendor_name} sent {formatCents(inv.amount)} USD
                      </div>
                      <div className="text-xs text-[#93A4BD] mt-0.5">
                        Expected {formatCents(inv.expected_amount || 20)} USD &bull; Invoice #{inv.invoice_number || "INV"} &bull; Due {inv.due_date}
                      </div>
                      <div className="text-[11px] text-[#D97706] mt-1 font-medium">
                        Amount differs from the contract. Waiting for your review.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => showToast(`Invoice #${inv.invoice_number} approved for payment.`)}
                        className="px-4 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors"
                      >
                        Approve payment
                      </button>
                      <button
                        onClick={() => showToast(`Invoice #${inv.invoice_number} rejected.`)}
                        className="px-4 py-2 rounded-xl bg-[#22314A] hover:bg-[#DC2626]/20 text-[#93A4BD] hover:text-[#DC2626] text-xs font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL M5: Approve Vendor */}
      {approvingVendor && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#E8EEF7]">Approve Vendor Account</h3>
              <button
                onClick={() => setApprovingVendor(null)}
                className="text-[#93A4BD] hover:text-[#E8EEF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg ? (
              <div className="p-3.5 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 text-xs text-[#DC2626]">
                {errorMsg}
              </div>
            ) : null}

            <p className="text-xs text-[#93A4BD] leading-relaxed">
              Approve <strong>{approvingVendor.name}</strong> to receive payments?
            </p>

            <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#93A4BD]">Payout Account:</span>
                <span className="font-mono font-bold text-[#34D399]">
                  {approvingVendor.wallet_address}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#93A4BD]">Network Asset:</span>
                <span className="text-[#E8EEF7]">USDT on NEAR</span>
              </div>
            </div>

            <p className="text-[11px] text-[#5B6B82]">
              Approving adds this address to your authorized destinations.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleConfirmApprove}
                disabled={signing}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {signing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Signing approval...</span>
                  </>
                ) : (
                  <span>Approve & add destination</span>
                )}
              </button>
              <button
                onClick={() => setApprovingVendor(null)}
                className="w-full py-2 rounded-xl bg-[#22314A] text-xs font-semibold text-[#93A4BD] hover:text-[#E8EEF7]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
