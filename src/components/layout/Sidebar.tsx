"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sliders,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Spending Policies", href: "/policies", icon: Sliders },
  { name: "On-Chain Auth", href: "/permissions", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0A0D14] border-r border-slate-800/80 flex flex-col justify-between shrink-0 font-sans">
      <div>
        {/* Brand header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00EC97] flex items-center justify-center text-[#0A0E17] font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              NEARbligo
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Invoice Payments</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#00EC97]/15 text-[#00EC97] border border-[#00EC97]/25 font-bold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer system status */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <div className="p-3 rounded-xl bg-[#111622] border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              NEAR Intents
            </span>
            <span className="text-emerald-400 font-semibold">Ready</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate">
            RPC: rpc.mainnet.near.org
          </div>
        </div>
      </div>
    </aside>
  );
}
