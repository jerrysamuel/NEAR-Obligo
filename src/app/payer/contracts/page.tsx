"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  PlusCircle,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { formatCents, parseDollarsToCents } from "@/lib/money";

interface ContractItem {
  id: string;
  name: string;
  vendor_name: string;
  vendor_id: string;
  rate_cents: number;
  unit: string;
  max_amount: number;
  tolerance_pct: number;
  auto_pay: boolean;
  frequency: string;
  starts_on: string;
  status: string;
}

interface VendorOption {
  id: string;
  name: string;
}

export default function PayerContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal M6 state
  const [showModal, setShowModal] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [contractName, setContractName] = useState("");
  const [rateDollars, setRateDollars] = useState("0.20");
  const [unit, setUnit] = useState("delivery");
  const [limitDollars, setLimitDollars] = useState("0.50");
  const [tolerancePct, setTolerancePct] = useState(10);
  const [autoPay, setAutoPay] = useState(true);
  const [frequency, setFrequency] = useState("weekly");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = () => {
    fetch("/api/payer/contracts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.contracts)) setContracts(data.contracts);
      })
      .finally(() => setLoading(false));

    fetch("/api/payer/vendors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.vendors)) {
          setVendors(data.vendors);
          if (data.vendors.length > 0 && !vendorId) {
            setVendorId(data.vendors[0].id);
          }
        }
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const rateCents = parseDollarsToCents(rateDollars);
    const limitCents = parseDollarsToCents(limitDollars);

    if (limitCents < rateCents) {
      setFormError("Per-invoice limit must be at least equal to the contract rate.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payer/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vendorId,
          name: contractName,
          rate_cents: rateCents,
          unit,
          max_amount_cents: limitCents,
          tolerance_pct: tolerancePct,
          auto_pay: autoPay,
          frequency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create contract");

      setShowModal(false);
      setContractName("");
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EEF7]">Vendor Contracts</h1>
          <p className="text-xs text-[#93A4BD] mt-0.5">
            Agreements define the approved rate, schedule, and maximum spending ceiling per invoice.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError("");
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New contract</span>
        </button>
      </div>

      {/* Contracts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts.length === 0 ? (
          <div className="col-span-2 p-8 rounded-2xl bg-[#111C30] border border-[#22314A] text-center text-xs text-[#93A4BD]">
            No contracts defined yet. Click &quot;New contract&quot; to set rates and auto-pay limits.
          </div>
        ) : (
          contracts.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4 hover:border-[#34D399]/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#E8EEF7]">{c.name}</h3>
                  <div className="text-xs text-[#34D399] font-medium mt-0.5">{c.vendor_name}</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    c.auto_pay
                      ? "bg-emerald-500/15 text-[#34D399] border-emerald-500/30"
                      : "bg-amber-500/15 text-[#D97706] border-amber-500/30"
                  }`}
                >
                  {c.auto_pay ? "Auto-Pay ON" : "Manual Review"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs">
                <div>
                  <div className="text-[#93A4BD] text-[10px]">Agreed Rate</div>
                  <div className="font-bold text-[#E8EEF7] mt-0.5">
                    {formatCents(c.rate_cents)} {c.unit ? `per ${c.unit}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-[#93A4BD] text-[10px]">Per-Invoice Limit</div>
                  <div className="font-bold text-[#E8EEF7] mt-0.5">
                    {formatCents(c.max_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[#93A4BD] text-[10px]">Frequency</div>
                  <div className="font-medium text-[#E8EEF7] mt-0.5 capitalize">{c.frequency}</div>
                </div>
                <div>
                  <div className="text-[#93A4BD] text-[10px]">Tolerance</div>
                  <div className="font-medium text-[#E8EEF7] mt-0.5">&plusmn;{c.tolerance_pct}%</div>
                </div>
              </div>

              <div className="text-[11px] text-[#5B6B82] flex items-center justify-between pt-1">
                <span>Starts: {c.starts_on}</span>
                <span className="text-[#34D399] font-semibold">Active agreement</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL M6: New Contract */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#E8EEF7]">Create New Contract</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#93A4BD] hover:text-[#E8EEF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 text-xs text-[#DC2626]">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#93A4BD]">Vendor / Contractor</label>
                <select
                  required
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#93A4BD]">Contract Name</label>
                <input
                  type="text"
                  required
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  placeholder="e.g. Weekly Fleet Fuel Deliveries"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#93A4BD]">Rate (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={rateDollars}
                    onChange={(e) => setRateDollars(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#93A4BD]">Unit Description</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. delivery, hour, load"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#93A4BD]">Per-Invoice Limit (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={limitDollars}
                    onChange={(e) => setLimitDollars(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#93A4BD]">Variance Tolerance (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={tolerancePct}
                    onChange={(e) => setTolerancePct(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#93A4BD]">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="adhoc">Per Delivery / As Invoiced</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#93A4BD]">Automatic Payment</label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="autoPay"
                      checked={autoPay}
                      onChange={(e) => setAutoPay(e.target.checked)}
                      className="w-4 h-4 rounded text-[#34D399] bg-[#0A1220] border-[#22314A]"
                    />
                    <label htmlFor="autoPay" className="text-xs text-[#E8EEF7] cursor-pointer">
                      Auto-pay within limits
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {submitting ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
                <span>Save Contract Agreement</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
