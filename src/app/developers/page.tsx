"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  KeyRound,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Cpu,
  Layers,
  Code,
  ExternalLink,
} from "lucide-react";

export default function DevelopersPage() {
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);

  const mcpEndpoint = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "http://localhost:3000/api/mcp";

  const copyMcp = () => {
    navigator.clipboard.writeText(mcpEndpoint);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const generateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const fakeKey = `nbligo_live_${Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;
    setCreatedKey(fakeKey);
    setShowKeyModal(true);
    setKeyName("");
  };

  const copyCreatedKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const toolsList = [
    {
      name: "get_invoices",
      desc: "Retrieve audited stream of invoices, amounts, and settlement statuses.",
    },
    {
      name: "get_obligations",
      desc: "Fetch active logistics contracts, contracted unit rates, and limits.",
    },
    {
      name: "submit_invoice",
      desc: "Submit delivery tickets and line items to trigger deterministic rules evaluation.",
    },
    {
      name: "evaluate_invoice",
      desc: "Dry-run integer arithmetic validation against active caps without disbursing.",
    },
    {
      name: "approve_invoice",
      desc: "Provide authorized payer approval for flagged over-limit invoices.",
    },
    {
      name: "emergency_pause",
      desc: "Instantly freeze all automated outgoing payments across all contracts.",
    },
  ];

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        nearbligo: {
          command: "node",
          args: ["scripts/mcp-server.js"],
          env: {
            NEARBLIGO_API_URL: mcpEndpoint,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="min-h-screen bg-[#0A1220] text-[#E8EEF7] p-6 lg:p-10 max-w-4xl mx-auto space-y-8 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#22314A] pb-4">
        <Link
          href="/payer"
          className="flex items-center gap-2 text-xs font-semibold text-[#93A4BD] hover:text-[#34D399] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payer Portal</span>
        </Link>
        <span className="text-xs font-mono text-[#34D399] bg-[#34D399]/10 px-2.5 py-1 rounded-full border border-[#34D399]/20">
          MCP v1.0 &bull; NEAR Intents
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EEF7]">Developer API & MCP Tools</h1>
        <p className="text-xs text-[#93A4BD] mt-1">
          Connect autonomous AI agents, enterprise ERPs, and workflow scripts to Nearbligo accounts payable.
        </p>
      </div>

      {/* MCP Endpoint Card */}
      <div className="p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#34D399] uppercase tracking-wider">
          <Terminal className="w-4 h-4" />
          <span>Model Context Protocol (MCP) Server Endpoint</span>
        </div>
        <p className="text-xs text-[#93A4BD] leading-relaxed">
          Standardized discovery and execution endpoint for Claude Desktop, Cursor, and custom agent frameworks.
        </p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0A1220] border border-[#22314A] font-mono text-xs">
          <span className="flex-1 text-[#E8EEF7] truncate">{mcpEndpoint}</span>
          <button
            onClick={copyMcp}
            className="px-3 py-1.5 rounded-lg bg-[#22314A] hover:bg-[#34D399]/20 hover:text-[#34D399] text-xs font-semibold text-[#93A4BD] transition-colors flex items-center gap-1.5"
          >
            {copiedMcp ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Access Keys Section */}
      <div className="p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E8EEF7] uppercase tracking-wider">
            <KeyRound className="w-4 h-4 text-[#34D399]" />
            <span>Developer Access Keys</span>
          </div>
        </div>

        <form onSubmit={generateKey} className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Key label (e.g. Logistics Dispatch Agent)..."
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] placeholder-[#5B6B82] focus:outline-none focus:border-[#34D399]"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors shrink-0"
          >
            Create access key
          </button>
        </form>
      </div>

      {/* Registered Tools */}
      <div className="p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#E8EEF7] uppercase tracking-wider">
          <Cpu className="w-4 h-4 text-[#34D399]" />
          <span>Exposed Autonomous Tools</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {toolsList.map((t) => (
            <div
              key={t.name}
              className="p-3.5 rounded-xl bg-[#0A1220] border border-[#22314A] space-y-1 text-xs"
            >
              <div className="font-mono font-bold text-[#34D399]">{t.name}</div>
              <div className="text-[11px] text-[#93A4BD] leading-relaxed">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Guide */}
      <div className="p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#E8EEF7] uppercase tracking-wider">
          <Code className="w-4 h-4 text-[#34D399]" />
          <span>Claude Desktop & Cursor Configuration</span>
        </div>
        <p className="text-xs text-[#93A4BD]">
          Add this to your <code>claude_desktop_config.json</code>:
        </p>
        <pre className="p-4 rounded-xl bg-[#0A1220] border border-[#22314A] text-[11px] font-mono text-[#34D399] overflow-x-auto">
          {claudeConfig}
        </pre>
      </div>

      {/* Access Key Modal M15 */}
      {showKeyModal && createdKey && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#E8EEF7]">Access Key Created</h3>
            <p className="text-xs text-[#93A4BD] leading-relaxed">
              Copy this token now. <strong>It will never be shown again.</strong>
            </p>
            <div className="p-3 rounded-xl bg-[#0A1220] border border-[#22314A] font-mono text-xs text-[#34D399] break-all select-all">
              {createdKey}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={copyCreatedKey}
                className="flex-1 py-2.5 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? "Copied to clipboard" : "Copy token"}</span>
              </button>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setCreatedKey(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#22314A] text-[#93A4BD] hover:text-[#E8EEF7] text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
