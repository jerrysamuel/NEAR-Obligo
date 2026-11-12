"use client";

import { useState } from "react";
import {
  Sparkles,
  Send,
  Lock,
  Cpu,
  Layers,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Bot,
} from "lucide-react";

const SUGGESTED_QUERIES = [
  "How much am I spending on subscriptions every month?",
  "Which subscriptions renew this week?",
  "What are my most expensive subscriptions?",
  "How much would I save if I cancelled my two most expensive subscriptions?",
  "How much of my monthly budget is committed to subscriptions, and how much can I comfortably spend on a new laptop?",
];

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  content: string;
  isPrivate?: boolean;
  model?: string;
  provider?: string;
  timestamp: string;
}

export default function InsightsPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_init",
      sender: "agent",
      content:
        "Hello Jerry! I am your Obligo Private Commerce & Expense Agent. I can analyze your subscriptions deterministically, calculate your remaining free cashflow, and evaluate tech purchases without disclosing your private identity to external networks.",
      isPrivate: true,
      model: "TEE-Hardware-Enclave",
      provider: "Obligo Confidential Engine",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(textToSend?: string) {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      const json = await res.json();

      if (json.success && json.response) {
        const agentMsg: ChatMessage = {
          id: `agent_${Date.now()}`,
          sender: "agent",
          content: json.response.content,
          isPrivate: json.response.isPrivateInference,
          model: json.response.model,
          provider: json.response.provider,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        throw new Error(json.error || "Failed to process query");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "agent",
          content: `Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span>Confidential Commerce & Subscription Intelligence</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            NEAR AI Cloud inference & deterministic math safeguards with hardware attestation verification.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
          <Lock className="w-3.5 h-3.5" />
          <span>TEE Attested Inference</span>
        </div>
      </div>

      {/* Suggested 1-Click Prompt Pills */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Try Hackathon Test Scenarios:</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 transition text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 flex flex-col h-[520px] shadow-2xl overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              } space-y-1`}
            >
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                {m.sender === "agent" && <Bot className="w-3 h-3 text-emerald-400" />}
                <span>{m.sender === "user" ? "You" : "Obligo Private Agent"}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                  m.sender === "user"
                    ? "bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-emerald-500/10"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                }`}
              >
                {m.content}
              </div>

              {m.sender === "agent" && m.model && (
                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1 text-emerald-400/80">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Attested TEE Enclave
                  </span>
                  <span>•</span>
                  <span>{m.model}</span>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 italic font-mono p-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Sanitizing context & querying confidential TEE inference...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center space-x-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about recurring spend, upcoming renewals, or purchase capacity..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-lg shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
