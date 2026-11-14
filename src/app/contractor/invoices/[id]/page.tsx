"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RotateCw,
  ArrowLeft,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { formatCents } from "@/lib/money";

interface InvoiceData {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  refusal_reason?: string;
  wallet_address: string;
  created_at: string;
  obligations?: {
    name: string;
    rate_cents: number;
    unit: string;
  };
  vendors?: {
    name: string;
  };
  payment_attempts?: Array<{
    id: string;
    status: string;
    tx_ref?: string;
    agent_operation_ref?: string;
  }>;
}

export default function InvoiceStatusPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
      }
    } catch (err) {
      console.error("Error fetching invoice status:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoice();
      // Poll every 3 seconds if not in a final state
      const interval = setInterval(() => {
        if (
          invoice &&
          invoice.status !== "settled" &&
          invoice.status !== "refused" &&
          invoice.status !== "failed"
        ) {
          fetchInvoice();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchInvoice();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#93A4BD] flex items-center justify-center gap-2">
        <RotateCw className="w-4 h-4 animate-spin text-[#34D399]" />
        <span>Loading invoice details...</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-sm font-bold text-[#E8EEF7]">Invoice not found</div>
        <Link
          href="/contractor/invoices"
          className="text-xs text-[#34D399] underline"
        >
          Return to invoices
        </Link>
      </div>
    );
  }

  // 4 steps determination
  // Step 1: Submitted (always true once created)
  // Step 2: Checked (true if status in verified, needs_approval, settled, refused, failed)
  // Step 3: Approved (true if settled, or awaiting if needs_approval)
  // Step 4: Paid (true if settled)

  const isStep1Complete = true;
  const isStep2Complete = [
    "verified",
    "needs_approval",
    "settled",
    "refused",
    "failed",
  ].includes(invoice.status);
  const isStep3Complete = invoice.status === "settled";
  const isStep4Complete = invoice.status === "settled";

  const isNeedsApproval = invoice.status === "needs_approval";
  const isRefused = invoice.status === "refused" || invoice.status === "failed";
  const isSettled = invoice.status === "settled";

  const latestAttempt = invoice.payment_attempts?.[0];

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/contractor/invoices"
            className="p-2 rounded-xl bg-[#111C30] border border-[#22314A] text-[#93A4BD] hover:text-[#E8EEF7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#E8EEF7]">
              Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
            </h1>
            <p className="text-xs text-[#93A4BD]">
              {invoice.obligations?.name || "Contract service"}
            </p>
          </div>
        </div>
        <button
          onClick={handleManualRefresh}
          className="p-2 rounded-xl bg-[#111C30] border border-[#22314A] text-[#93A4BD] hover:text-[#34D399] transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#34D399]" : ""}`} />
        </button>
      </div>

      {/* Primary Status Banner */}
      {isSettled ? (
        <div className="p-5 rounded-2xl bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#34D399]/20 text-[#34D399]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#E8EEF7]">Payment Complete</div>
              <div className="text-xs text-[#34D399]">
                {formatCents(invoice.amount)} USD successfully disbursed
              </div>
            </div>
          </div>
          <Link
            href={`/receipt/${invoice.id}`}
            className="px-3.5 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Receipt</span>
          </Link>
        </div>
      ) : isNeedsApproval ? (
        <div className="p-5 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/30 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D97706]/20 text-[#D97706]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#E8EEF7]">Waiting for Payer Review</div>
            <div className="text-xs text-[#93A4BD] mt-0.5">
              Invoice amount exceeds pre-approved limit. Your payer has been notified.
            </div>
          </div>
        </div>
      ) : isRefused ? (
        <div className="p-5 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#DC2626]/20 text-[#DC2626]">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#E8EEF7]">Payment Declined</div>
            <div className="text-xs text-[#DC2626] mt-0.5">
              Reason: {invoice.refusal_reason || "Rules check failed"}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#34D399]/10 text-[#34D399]">
            <RotateCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#E8EEF7]">Processing Invoice</div>
            <div className="text-xs text-[#93A4BD] mt-0.5">
              Checking contract rules and initiating automated payment...
            </div>
          </div>
        </div>
      )}

      {/* 4-Step Live Progress Tracker */}
      <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
        <h3 className="text-xs font-bold text-[#93A4BD] uppercase tracking-wider">
          Payment Progress
        </h3>

        <div className="space-y-4">
          {/* Step 1: Submitted */}
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-full bg-[#34D399]/20 text-[#34D399] mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#E8EEF7]">1. Submitted</div>
              <div className="text-[11px] text-[#93A4BD]">
                Invoice received and recorded in ledger.
              </div>
            </div>
          </div>

          {/* Step 2: Checked */}
          <div className="flex items-start gap-3">
            <div
              className={`p-1 rounded-full mt-0.5 ${
                isStep2Complete
                  ? isRefused
                    ? "bg-[#DC2626]/20 text-[#DC2626]"
                    : "bg-[#34D399]/20 text-[#34D399]"
                  : "bg-[#22314A] text-[#93A4BD]"
              }`}
            >
              {isStep2Complete ? (
                isRefused ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-[#E8EEF7]">2. Checked Against Rules</div>
              <div className="text-[11px] text-[#93A4BD]">
                Verified contract rate, payout account, and monthly limits.
              </div>
            </div>
          </div>

          {/* Step 3: Approved */}
          <div className="flex items-start gap-3">
            <div
              className={`p-1 rounded-full mt-0.5 ${
                isStep3Complete
                  ? "bg-[#34D399]/20 text-[#34D399]"
                  : isNeedsApproval
                  ? "bg-[#D97706]/20 text-[#D97706]"
                  : isRefused
                  ? "bg-[#22314A] text-[#5B6B82]"
                  : "bg-[#22314A] text-[#93A4BD]"
              }`}
            >
              {isStep3Complete ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isNeedsApproval ? (
                <Clock className="w-4 h-4 animate-pulse" />
              ) : isRefused ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-[#E8EEF7]">
                3. {isNeedsApproval ? "Awaiting Payer Review" : isRefused ? "Not approved" : "Approved"}
              </div>
              <div className="text-[11px] text-[#93A4BD]">
                {isNeedsApproval
                  ? "Requires payer confirmation to disburse."
                  : isRefused
                  ? `Authorization stopped: ${invoice.refusal_reason || "rules check failed"}.`
                  : "Invoice authorization is active."}
              </div>
            </div>
          </div>

          {/* Step 4: Paid */}
          <div className="flex items-start gap-3">
            <div
              className={`p-1 rounded-full mt-0.5 ${
                isStep4Complete
                  ? "bg-[#34D399]/20 text-[#34D399]"
                  : "bg-[#22314A] text-[#93A4BD]"
              }`}
            >
              {isStep4Complete ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-[#E8EEF7]">4. {isRefused ? "Not paid" : "Paid to Account"}</div>
              <div className="text-[11px] text-[#93A4BD]">
                {isStep4Complete
                  ? `Transferred directly to ${invoice.wallet_address}.`
                  : isRefused
                  ? "No funds were sent. Correct the payout account and submit a new invoice."
                  : `Will be sent to ${invoice.wallet_address}.`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-3 text-xs">
        <h3 className="font-bold text-[#E8EEF7]">Invoice Details</h3>

        <div className="flex justify-between border-b border-[#22314A] pb-2">
          <span className="text-[#93A4BD]">Amount:</span>
          <span className="font-bold text-[#E8EEF7]">{formatCents(invoice.amount)} USD</span>
        </div>

        <div className="flex justify-between border-b border-[#22314A] pb-2">
          <span className="text-[#93A4BD]">Recipient Account:</span>
          <span className="font-mono text-[#34D399]">{invoice.wallet_address}</span>
        </div>

        <div className="flex justify-between border-b border-[#22314A] pb-2">
          <span className="text-[#93A4BD]">Submitted At:</span>
          <span className="text-[#E8EEF7]">
            {new Date(invoice.created_at).toLocaleString()}
          </span>
        </div>

        {latestAttempt?.tx_ref && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-[#93A4BD]">Transaction:</span>
            <span className="font-mono text-[#34D399]">
              {latestAttempt.tx_ref.slice(0, 16)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
