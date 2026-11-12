"use client";

import { Shield, Lock, Layers } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero-Knowledge Disclosure Engine</span>
        </span>
      </div>

      <div className="flex items-center space-x-3 text-xs">
        {/* Hardware Attestation Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>TEE Hardware Attested</span>
        </div>

        {/* NEAR Testnet Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>NEAR Testnet: obligo-permissions.testnet</span>
        </div>

        {/* User Identity */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-semibold text-xs flex items-center justify-center">
            JS
          </div>
          <span className="text-slate-300 font-medium hidden sm:inline">Jerry Samuel</span>
        </div>
      </div>
    </header>
  );
}
