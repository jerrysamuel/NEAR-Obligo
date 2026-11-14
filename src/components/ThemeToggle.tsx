"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
      className={`p-2 rounded-xl transition-all duration-160 flex items-center justify-center border ${
        theme === "dark"
          ? "bg-[#111C30] border-[#22314A] text-[#E8EEF7] hover:border-[#34D399] hover:text-[#34D399]"
          : "bg-white border-[#E2E8F0] text-[#0B1F3A] hover:border-[#0B2545] hover:text-[#0B2545] shadow-xs"
      } ${className}`}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-[#F59E0B]" />
      ) : (
        <Moon className="w-4 h-4 text-[#0B2545]" />
      )}
    </button>
  );
}
