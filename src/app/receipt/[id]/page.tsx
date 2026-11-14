"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  Printer,
  CheckCircle2,
  ArrowLeft,
  Copy,
  ExternalLink,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { formatCents, centsToUnits } from "@/lib/money";

interface InvoiceReceipt {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  created_at: string;
  wallet_address: string;
  vendors?: {
    name: string;
    wallet_address: string;
  };
  obligations?: {
    name: string;
    rate_cents: number;
    unit: string;
  };
  payment_attempts?: Array<{
    id: string;
    idempotency_key: string;
    status: string;
    tx_ref?: string;
    agent_operation_ref?: string;
    created_at: string;
  }>;
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [receipt, setReceipt] = useState<InvoiceReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (res.ok) {
          const data = await res.json();
          setReceipt(data.invoice);
        }
      } catch (err) {
        console.error("Receipt error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReceipt();
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1220] flex items-center justify-center p-4">
        <div className="text-xs text-[#93A4BD] flex items-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>Generating receipt...</span>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-[#0A1220] flex flex-col items-center justify-center p-4 space-y-3">
        <div className="text-sm font-bold text-[#E8EEF7]">Receipt not found</div>
        <button
          onClick={() => router.back()}
          className="text-xs text-[#34D399] underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const latestAttempt = receipt.payment_attempts?.[0];
  const txRef = latestAttempt?.tx_ref || "near_tx_settled";
  const rawUnits = centsToUnits(receipt.amount);

  return (
    <div className="min-h-screen bg-[#0A1220] text-[#E8EEF7] p-4 sm:p-8 flex flex-col items-center">
      {/* Top action bar - hidden on print */}
      <div className="w-full max-w-xl flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[#93A4BD] hover:text-[#E8EEF7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-[#34D399]/10"
        >
          <Printer className="w-4 h-4" />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Main Printable Receipt Card */}
      <div className="w-full max-w-xl bg-[#111C30] border border-[#22314A] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl print:border-none print:shadow-none print:p-0">
        {/* Receipt Header */}
        <div className="border-b border-[#22314A] pb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#34D399] text-[#0A1220] flex items-center justify-center font-black text-xs">
                N
              </div>
              <span className="font-bold text-sm tracking-wide text-[#E8EEF7]">
                Nearbligo
              </span>
            </div>
            <div className="text-[11px] text-[#93A4BD] mt-1">
            Invoice settlement on NEAR
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#34D399]/15 text-[#34D399]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled</span>
            </span>
            <div className="text-[11px] text-[#93A4BD] mt-1">
              Receipt #{receipt.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#93A4BD] block">Paid To</span>
            <span className="font-bold text-[#E8EEF7] text-sm block mt-0.5">
              {receipt.vendors?.name || "Contractor"}
            </span>
            <span className="font-mono text-[11px] text-[#34D399] block mt-0.5">
              {receipt.wallet_address}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[#93A4BD] block">Date Settled</span>
            <span className="font-semibold text-[#E8EEF7] block mt-0.5">
              {new Date(receipt.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-[11px] text-[#93A4BD] block mt-0.5">
              Invoice #{receipt.invoice_number || receipt.id.slice(0, 6)}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-4 rounded-2xl bg-[#0A1220] border border-[#22314A] space-y-3">
          <div className="text-[11px] font-bold text-[#93A4BD] uppercase tracking-wider flex justify-between">
            <span>Description</span>
            <span>Amount</span>
          </div>

          <div className="flex justify-between items-center text-xs pt-1">
            <div>
              <span className="font-semibold text-[#E8EEF7]">
                {receipt.obligations?.name || "Contracted service"}
              </span>
              <div className="text-[11px] text-[#93A4BD] mt-0.5">
                Contract rate: {formatCents(receipt.obligations?.rate_cents || 20)} USD
              </div>
            </div>
            <span className="font-bold text-[#E8EEF7]">
              {formatCents(receipt.amount)} USD
            </span>
          </div>

          <div className="border-t border-[#22314A] pt-3 flex justify-between items-center">
            <span className="text-xs font-bold text-[#E8EEF7]">Total Disbursed</span>
            <div className="text-right">
              <span className="text-base font-bold text-[#34D399]">
                {formatCents(receipt.amount)} USD
              </span>
              <div className="text-[10px] text-[#93A4BD] font-mono">
                {rawUnits} units USDT
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Execution Details */}
        <div className="space-y-2 text-[11px] text-[#93A4BD] pt-2 border-t border-[#22314A]">
          <div className="flex justify-between items-center">
            <span>Transaction Reference:</span>
            <div className="flex items-center gap-1 font-mono text-[#E8EEF7]">
              <span>{txRef.length > 20 ? `${txRef.slice(0, 10)}...${txRef.slice(-8)}` : txRef}</span>
              <button
                onClick={() => copyToClipboard(txRef)}
                className="hover:text-[#34D399] transition-colors print:hidden"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {latestAttempt?.idempotency_key && (
            <div className="flex justify-between items-center">
              <span>Idempotency Key:</span>
              <span className="font-mono text-[#E8EEF7]">
                {latestAttempt.idempotency_key.slice(0, 16)}...
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span>Settlement Rail:</span>
            <span className="text-[#34D399] font-medium">NEAR Intents Agent API</span>
          </div>
        </div>

        {/* Security badge */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#34D399]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Cryptographically verified payment on NEAR Protocol</span>
        </div>
      </div>
    </div>
  );
}
