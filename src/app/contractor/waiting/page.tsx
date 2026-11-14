"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, RotateCw, ArrowRight } from "lucide-react";

export default function ContractorWaitingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("pending_approval");
  const [payerName, setPayerName] = useState("your payer");
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    const queryVendorId = new URLSearchParams(window.location.search).get("vendor_id");
    setVendorId(queryVendorId || window.sessionStorage.getItem("nearbligo_vendor_id"));
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    try {
      if (!vendorId) return;

      const res = await fetch(`/api/invoices?vendor_id=${encodeURIComponent(vendorId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.vendor_status) setStatus(data.vendor_status);
      if (data?.vendor_name) setPayerName(data.vendor_name);
      if (data?.vendor_status === "active") {
        router.push("/contractor");
      }
    } catch (err) {
      console.warn("Check status error:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Auto-refresh every 5 seconds per Section 3 C3
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [router, vendorId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 text-center font-sans">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-6 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#D97706]/15 text-[#D97706] flex items-center justify-center mx-auto border border-[#D97706]/30">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#E8EEF7]">
            Waiting for {payerName} to approve your payout details
          </h1>
          <p className="text-xs text-[#93A4BD] mt-2 leading-relaxed">
            Your payout account has been submitted. For security, your payer must approve this account before invoices can be processed.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] flex items-center justify-center gap-2 text-xs text-[#93A4BD]">
          <span className="w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
          <span>Auto-checking status every 5 seconds...</span>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checking ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
            <span>Check again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
