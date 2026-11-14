"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldX,
  Layers,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [authorisations, setAuthorisations] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [permRes, authRes] = await Promise.all([
        fetch("/api/privacy/permissions"),
        fetch("/api/near/authorisations"),
      ]);
      const permJson = await permRes.json();
      const authJson = await authRes.json();

      if (permJson.success) {
        setPermissions(permJson.permissions);
      }
      if (authJson.success) {
        setAuthorisations(authJson.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRevokeDisclosure(id: string) {
    if (!confirm("Are you sure you want to revoke this disclosure permission?")) return;
    try {
      const res = await fetch(`/api/privacy/permissions?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPermissions((prev) =>
          prev.map((p) => (p.id === id ? { ...p, revokedAt: new Date().toISOString() } : p))
        );
      }
    } catch (e) {
      console.error("Revoke error:", e);
    }
  }

  async function handleRevokeNear(id: string) {
    if (!confirm("Revoke this verifiable on-chain authorisation?")) return;
    try {
      const res = await fetch(`/api/near/authorisations?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setAuthorisations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, revoked: true } : a))
        );
      }
    } catch (e) {
      console.error("NEAR revoke error:", e);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Permissions & NEAR Verifiable Authorisations</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit external recipient disclosures, cryptographic permission hashes, and NEAR mainnet contract records.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* On-Chain NEAR Records Section */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">NEAR Testnet Verifiable Records</h2>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-500/30">
            Contract: obligoo.near
          </span>
        </div>

        <div className="space-y-3">
          {authorisations.length > 0 ? (
            authorisations.map((auth) => (
              <div
                key={auth.id}
                className={`p-4 rounded-xl border transition ${
                  auth.revoked
                    ? "bg-slate-950/40 border-slate-800 opacity-60"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white uppercase font-mono">
                        {auth.actionType}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                          auth.revoked
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {auth.revoked ? "REVOKED ON-CHAIN" : "VALID & IMMUTABLE"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center space-x-2 font-mono">
                      <span>Spending Limit: {formatCurrency(auth.spendingLimit, auth.currency)}</span>
                      <span>•</span>
                      <span>Contract: {auth.contractId}</span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 break-all pt-1">
                      Hash: <span className="text-slate-300">{auth.permissionHash}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {auth.transactionHash && (
                      <a
                        href={`https://nearblocks.io/txns/${auth.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono transition flex items-center gap-1"
                      >
                        <span>NEAR Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {!auth.revoked && (
                      <button
                        onClick={() => handleRevokeNear(auth.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-medium transition flex items-center gap-1"
                      >
                        <ShieldX className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No on-chain authorization records logged yet.
            </div>
          )}
        </div>
      </div>

      {/* Off-Chain Data Disclosure Policies */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Lock className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Active Recipient Disclosure Permissions</h2>
        </div>

        <div className="space-y-3">
          {permissions.length > 0 ? (
            permissions.map((perm) => {
              const isRevoked = Boolean(perm.revokedAt);
              const isExpired = new Date(perm.expiresAt) < new Date();
              return (
                <div
                  key={perm.id}
                  className={`p-4 rounded-xl border transition ${
                    isRevoked || isExpired
                      ? "bg-slate-950/40 border-slate-800 opacity-60"
                      : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-white">{perm.recipient}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            isRevoked
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : isExpired
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isRevoked ? "REVOKED" : isExpired ? "EXPIRED" : "ACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{perm.purpose}</p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-500">Permitted fields:</span>
                        {perm.permittedFields.map((field: string) => (
                          <span
                            key={field}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!isRevoked && !isExpired && (
                      <button
                        onClick={() => handleRevokeDisclosure(perm.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-medium transition self-start sm:self-center flex items-center gap-1"
                      >
                        <ShieldX className="w-3 h-3" />
                        <span>Revoke Access</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No active merchant disclosures registered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
