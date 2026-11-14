import Link from "next/link";
import { ArrowRight, Building2, Truck, ShieldCheck } from "lucide-react";

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-[#0A1220] text-[#E8EEF7] flex flex-col justify-between font-sans p-6 sm:p-12">
      <div className="max-w-4xl mx-auto w-full space-y-12 my-auto">
        {/* Header Branding */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Policy-Controlled Invoice Payments</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#E8EEF7]">
            Nearbligo
          </h1>
          <p className="text-sm sm:text-base text-[#93A4BD] max-w-xl">
            Invoice payment infrastructure for businesses and contractors. Payments stay within approved contract limits, unusual invoices are escalated, and unsafe payouts are halted.
          </p>
        </div>

        {/* Portal Entry Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payer Portal */}
          <Link
            href="/payer"
            className="group p-6 rounded-2xl bg-[#111C30] border border-[#22314A] hover:border-[#34D399] transition-all duration-200 space-y-4 hover:shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 text-[#34D399] flex items-center justify-center border border-[#34D399]/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#E8EEF7] group-hover:text-[#34D399] transition-colors flex items-center justify-between">
                <span>Payer Dashboard</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </h2>
              <p className="text-xs text-[#93A4BD] mt-1.5 leading-relaxed">
                Configure spending rules, invite contractors, approve invoices exceeding limits, and monitor automated settlement.
              </p>
            </div>
            <div className="pt-3 border-t border-[#22314A] flex items-center text-xs font-semibold text-[#34D399]">
              Enter Payer Workspace &rarr;
            </div>
          </Link>

          {/* Contractor Portal */}
          <Link
            href="/contractor"
            className="group p-6 rounded-2xl bg-[#111C30] border border-[#22314A] hover:border-[#34D399] transition-all duration-200 space-y-4 hover:shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-[#2563EB]/15 text-[#2563EB] flex items-center justify-center border border-[#2563EB]/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#E8EEF7] group-hover:text-[#34D399] transition-colors flex items-center justify-between">
                <span>Contractor Portal</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </h2>
              <p className="text-xs text-[#93A4BD] mt-1.5 leading-relaxed">
                Submit invoices against active agreements, track payment status, and view receipts.
              </p>
            </div>
            <div className="pt-3 border-t border-[#22314A] flex items-center text-xs font-semibold text-[#34D399]">
              Open Contractor App &rarr;
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#5B6B82] pt-8">
        Nearbligo &bull; Powered by NEAR Intents Settlement &bull; USDT on NEAR
      </footer>
    </div>
  );
}
