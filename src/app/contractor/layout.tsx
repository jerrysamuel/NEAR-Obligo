"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, FileText, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ContractorLayoutProps {
  children: React.ReactNode;
}

export default function ContractorLayout({ children }: ContractorLayoutProps) {
  const pathname = usePathname();

  const tabs = [
    { label: "Home", href: "/contractor", icon: Home },
    { label: "New invoice", href: "/contractor/invoices/new", icon: PlusCircle, isCentre: true },
    { label: "Invoices", href: "/contractor/invoices", icon: FileText },
    { label: "Profile", href: "/contractor/profile", icon: User },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans pb-20 sm:pb-0 transition-colors duration-200">
      {/* Mobile Top App Bar */}
      <header className="h-14 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] px-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-[var(--accent-primary)] flex items-center justify-center font-bold text-xs text-[var(--accent-primary-fg)]">
            ◎
          </div>
          <span className="font-bold text-sm tracking-tight">Nearbligo</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="mono text-[11px] text-[var(--text-muted)] font-medium hidden xs:inline">Contractor Portal</div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-surface)] border-t border-[var(--border-hairline)] flex items-center justify-around px-2 z-40 max-w-lg mx-auto sm:max-w-none transition-colors duration-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/contractor"
              ? pathname === "/contractor"
              : pathname?.startsWith(tab.href);

          if (tab.isCentre) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-sm bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] flex items-center justify-center transition-transform active:scale-95 border border-[var(--border-strong)]">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="mono text-[10px] font-bold text-[var(--accent-primary)] mt-1">New invoice</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-[#10B981] dark:text-[#34D399]"
                  : "text-[#5B6B82] hover:text-[#0B2545] dark:text-[#93A4BD] dark:hover:text-[#E8EEF7]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
