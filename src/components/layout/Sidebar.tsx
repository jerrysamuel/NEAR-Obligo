"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Sparkles,
  Database,
  ShieldCheck,
  Cpu,
  ExternalLink,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Shopping", href: "/shopping", icon: ShoppingBag },
  { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { name: "Insights & AI", href: "/insights", icon: Sparkles },
  { name: "Private Memory", href: "/memory", icon: Database },
  { name: "Permissions", href: "/permissions", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div>
        {/* Brand header */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Obligo
              <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NEAR
              </span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium">Private Commerce Agent</p>
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
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-300">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" /> MCP Server
            </span>
            <span className="text-emerald-400">Online</span>
          </div>
          <p className="text-[11px] leading-tight text-slate-400">
            Tools exposed to AI clients via Streamable HTTP & stdio
          </p>
          <a
            href="/api/mcp"
            target="_blank"
            className="inline-flex items-center text-[10px] text-cyan-400 hover:underline gap-1 pt-1"
          >
            <span>View MCP JSON Endpoint</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <div className="text-[11px] text-slate-500 text-center font-mono">
          NEAR HACKATHON 2026 • PRV & SEC
        </div>
      </div>
    </aside>
  );
}
