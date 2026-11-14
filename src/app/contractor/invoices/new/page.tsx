"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  Shield,
  Layers,
  ChevronDown,
} from "lucide-react";
import { formatCents } from "@/lib/money";

interface Contract {
  id: string;
  name: string;
  rate_cents: number;
  unit: string;
  max_amount: number;
  status: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    // Generate default invoice number
    setInvoiceNumber(`INV-${Math.floor(100000 + Math.random() * 900000)}`);

    const loadContracts = async () => {
      try {
        const res = await fetch("/api/invoices");
        const data = await res.json();
        if (Array.isArray(data.contracts) && data.contracts.length > 0) {
          setContracts(data.contracts);
          setSelectedContract(data.contracts[0]);
        }
      } catch (err) {
        console.error("Failed to load contracts:", err);
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, []);

  const rate = selectedContract?.rate_cents || 20;
  const maxLimit = selectedContract?.max_amount || 50;
  const totalAmount = quantity * rate;
  const percentageOfLimit = Math.min(100, Math.round((totalAmount / maxLimit) * 100));
  const isOverLimit = totalAmount > maxLimit;

  // Determine limit color
  let barColor = "bg-[#34D399]";
  let statusText = "Within pre-approved budget";
  let statusTextColor = "text-[#34D399]";

  if (isOverLimit) {
    barColor = "bg-[#DC2626]";
    statusText = "Exceeds pre-approved limit — requires payer manual review";
    statusTextColor = "text-[#DC2626]";
  } else if (percentageOfLimit >= 90) {
    barColor = "bg-[#D97706]";
    statusText = "Approaching pre-approved limit";
    statusTextColor = "text-[#D97706]";
  }

  const handleSubmit = async () => {
    if (!selectedContract) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/vendor/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obligation_id: selectedContract.id,
          quantity,
          invoice_number: invoiceNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit invoice");
      }

      setShowConfirmModal(false);
      router.push(`/contractor/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#E8EEF7]">New Invoice</h1>
        <p className="text-xs text-[#93A4BD] mt-0.5">
          Submit completed services under your agreed contract.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[#93A4BD] flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>Loading contracts...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Card: Contract & Line Items */}
          <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            {/* Contract Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#93A4BD] mb-1.5">
                Active Contract
              </label>
              {contracts.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedContract?.id || ""}
                    onChange={(e) => {
                      const c = contracts.find((x) => x.id === e.target.value);
                      if (c) setSelectedContract(c);
                    }}
                    className="w-full appearance-none p-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] font-medium focus:outline-none focus:border-[#34D399]"
                  >
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {formatCents(c.rate_cents)} per {c.unit || "unit"}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#93A4BD] absolute right-3 top-3.5 pointer-events-none" />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#93A4BD]">
                  Default Logistics Service Agreement ($0.20 per mile)
                </div>
              )}
            </div>

            {/* Read-only agreed rate */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs">
              <div>
                <span className="text-[#93A4BD] block">Contracted Rate</span>
                <span className="font-bold text-[#E8EEF7] mt-0.5 block">
                  {formatCents(rate)} / {selectedContract?.unit || "unit"}
                </span>
              </div>
              <div>
                <span className="text-[#93A4BD] block">Pre-approved Cap</span>
                <span className="font-bold text-[#E8EEF7] mt-0.5 block">
                  {formatCents(maxLimit)}
                </span>
              </div>
            </div>

            {/* Quantity Stepper */}
            <div>
              <label className="block text-xs font-semibold text-[#93A4BD] mb-1.5">
                Quantity ({selectedContract?.unit || "miles"})
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl bg-[#0A1220] border border-[#22314A] text-[#E8EEF7] font-bold flex items-center justify-center hover:border-[#34D399] transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 p-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-center font-bold text-sm text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl bg-[#0A1220] border border-[#22314A] text-[#E8EEF7] font-bold flex items-center justify-center hover:border-[#34D399] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-[#93A4BD] mb-1.5">
                Invoice Reference #
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs font-mono text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
              />
            </div>
          </div>

          {/* Card: Total & Limit Visualization */}
          <div className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#93A4BD]">Total Invoice Amount</span>
                <div className="text-2xl font-bold text-[#E8EEF7]">
                  {formatCents(totalAmount)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#93A4BD]">Agreed Cap</span>
                <div className="text-xs font-semibold text-[#E8EEF7]">
                  {formatCents(maxLimit)}
                </div>
              </div>
            </div>

            {/* Visual limit bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-[#0A1220] overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-300`}
                  style={{ width: `${percentageOfLimit}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                {isOverLimit ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                )}
                <span className={statusTextColor}>{statusText}</span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="w-full py-3.5 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#34D399]/10"
          >
            <span>Review & Submit Invoice</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CONFIRMATION MODAL M11 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#E8EEF7]">Confirm Invoice Submission</h3>
            
            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 text-xs text-[#DC2626]">
                {errorMsg}
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#93A4BD]">Invoice Number:</span>
                <span className="font-mono text-[#E8EEF7]">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#93A4BD]">Contract:</span>
                <span className="text-[#E8EEF7]">{selectedContract?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#93A4BD]">Quantity:</span>
                <span className="text-[#E8EEF7]">{quantity} {selectedContract?.unit}</span>
              </div>
              <div className="flex justify-between border-t border-[#22314A] pt-2">
                <span className="font-bold text-[#E8EEF7]">Total Amount:</span>
                <span className="font-bold text-[#34D399]">{formatCents(totalAmount)} USD</span>
              </div>
            </div>

            {isOverLimit ? (
              <div className="p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-[11px] text-[#DC2626] leading-relaxed">
                <strong>Notice:</strong> This amount exceeds the pre-authorized contract limit ({formatCents(maxLimit)}). It will be routed to your payer for approval before funds are disbursed.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#34D399]/10 border border-[#34D399]/30 text-[11px] text-[#34D399] leading-relaxed">
                <strong>Instant Payment:</strong> This invoice matches your active contract rules and will be paid immediately upon submission.
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#22314A] text-xs font-semibold text-[#93A4BD] hover:text-[#E8EEF7] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Confirm & Send</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
