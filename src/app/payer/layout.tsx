"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Users,
  FileCheck2,
  CheckSquare,
  Settings,
  PauseCircle,
  PlayCircle,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface PayerLayoutProps {
  children: React.ReactNode;
}

export default function PayerLayout({ children }: PayerLayoutProps) {
  const pathname = usePathname();
  const [isPaused, setIsPaused] = useState(false);
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [companyName, setCompanyName] = useState("Payer workspace");

  useEffect(() => {
    // Initial fetch of pause state and pending approvals count
    fetch("/api/payer/funds")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.company) setCompanyName(data.company);
        if (typeof data?.soft_paused === "boolean") setIsPaused(data.soft_paused);
        if (typeof data?.pending_approvals === "number") setApprovalsCount(data.pending_approvals);
      })
      .catch(() => {});
  }, []);

  const togglePause = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    try {
      await fetch(nextState ? "/api/payer/pause" : "/api/payer/resume", {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to toggle pause state:", err);
    }
  };

  const navItems = [
    { label: "Home", href: "/payer", icon: Home },
    { label: "Invoices", href: "/payer/invoices", icon: FileText },
    { label: "Vendors", href: "/payer/vendors", icon: Users },
    { label: "Contracts", href: "/payer/contracts", icon: FileCheck2 },
    {
      label: "Approvals",
      href: "/payer/approvals",
      icon: CheckSquare,
      badge: approvalsCount > 0 ? approvalsCount : undefined,
    },
    { label: "Settings", href: "/payer/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden font-sans transition-colors duration-200">
      {/* Desktop Left Sidebar (Ledger Navy on Light, Deep Surface on Dark) */}
      <aside className="w-64 bg-[var(--bg-surface)] border-r border-[var(--border-hairline)] flex flex-col justify-between shrink-0 text-[var(--text-primary)]">
        <div>
          {/* Logo / Brand */}
          <div className="h-16 flex items-center px-5 border-b border-[var(--border-hairline)] gap-3">
            <div className="w-8 h-8 rounded-sm bg-[var(--accent-primary)] flex items-center justify-center font-bold text-[var(--accent-primary-fg)]">
              ◎
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">Nearbligo</div>
              <div className="mono text-[10px] text-[var(--text-muted)] uppercase font-semibold">Accounts Payable</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/payer"
                  ? pathname === "/payer"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-160 ${
                    isActive
                    ? "bg-[var(--bg-subtle)] text-[var(--accent-primary)] font-bold border border-[var(--border-strong)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="mono px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-[var(--status-policy-hold)] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-[var(--border-hairline)] space-y-3">
          <Link
            href="/developers"
            className="mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors block px-2"
          >
            Developer API & Tools
          </Link>
          <div className="flex items-center justify-between px-2 pt-2 border-t border-[var(--border-hairline)]">
            <div className="mono text-xs text-[var(--text-secondary)] truncate">{companyName}</div>
            <Link
              href="/api/auth/signout"
              className="text-[var(--text-secondary)] hover:text-[var(--status-breach)] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] px-6 flex items-center justify-between shrink-0 transition-colors duration-200">
          <div className="mono font-semibold text-sm">{companyName}</div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Pause Payments Switch */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5B6B82] dark:text-[#93A4BD] hidden sm:inline">
                {isPaused ? "Payments are paused" : "Payments active"}
              </span>
              <button
                onClick={togglePause}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-160 border ${
                  isPaused
                    ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30 dark:bg-[#DC2626]/15"
                    : "bg-white text-[#0B1F3A] border-[#E2E8F0] hover:border-[#0B2545] shadow-xs dark:bg-[#22314A] dark:text-[#E8EEF7] dark:border-[#22314A] dark:hover:border-[#34D399]"
                }`}
              >
                {isPaused ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5 text-[#5B6B82] dark:text-[#93A4BD]" />
                    <span>Pause payments</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Global Pause Alert Banner */}
        {isPaused && (
          <div className="bg-[#DC2626]/10 border-b border-[#DC2626]/20 dark:bg-[#DC2626]/15 dark:border-[#DC2626]/30 px-6 py-2.5 flex items-center gap-3 text-xs text-[#DC2626] shrink-0 transition-transform duration-240">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Payments are paused.</strong> Automatic approval and transfers are currently halted. Click Resume in the top bar to resume processing invoices.
            </span>
          </div>
        )}

        {/* Page Content Scroll Container */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F7F9FC] dark:bg-[#0A1220] transition-colors duration-200">
          <div className="max-w-6xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
