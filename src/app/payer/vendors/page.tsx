"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  X,
  ExternalLink,
} from "lucide-react";

interface VendorItem {
  id: string;
  name: string;
  category: string;
  wallet_address: string;
  wallet_verified: boolean;
  status: "invited" | "pending_approval" | "active" | "paused";
  contracts_count: number;
  created_at: string;
}

export default function PayerVendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // M4 Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Drawer
  const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null);

  const fetchVendors = () => {
    fetch("/api/payer/vendors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.vendors)) setVendors(data.vendors);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvite(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName }),
      });
      const data = await res.json();
      if (data.invite_url) {
        const fullUrl = `${window.location.origin}${data.invite_url}`;
        setGeneratedLink(fullUrl);
        fetchVendors();
      }
    } catch (err) {
      console.error("Invite error:", err);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mask payout account (e.g. ap...ar or ab12...9f per Section 1)
  const maskAccount = (acc: string) => {
    if (!acc || acc === "unassigned.near") return "Unassigned";
    if (acc.length <= 8) return acc;
    return `${acc.slice(0, 4)}...${acc.slice(-4)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          icon: CheckCircle2,
          className: "bg-emerald-500/15 text-[#34D399] border-emerald-500/30",
        };
      case "pending_approval":
        return {
          label: "Waiting for your approval",
          icon: Clock,
          className: "bg-amber-500/15 text-[#D97706] border-amber-500/30",
        };
      case "paused":
        return {
          label: "Paused",
          icon: PauseCircle,
          className: "bg-red-500/15 text-[#DC2626] border-red-500/30",
        };
      case "invited":
      default:
        return {
          label: "Invited",
          icon: Clock,
          className: "bg-blue-500/15 text-[#2563EB] border-blue-500/30",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EEF7]">Contractors & Vendors</h1>
          <p className="text-xs text-[#93A4BD] mt-0.5">
            Manage approved vendor accounts and issue new contractor invitations.
          </p>
        </div>
        <button
          onClick={() => {
            setGeneratedLink("");
            setInviteName("");
            setShowInviteModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite contractor</span>
        </button>
      </div>

      {/* Vendors Table */}
      <div className="rounded-2xl bg-[#111C30] border border-[#22314A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1220] border-b border-[#22314A] text-[#93A4BD] font-semibold">
              <tr>
                <th className="py-3.5 px-4">Contractor / Vendor</th>
                <th className="py-3.5 px-4">Payout Account</th>
                <th className="py-3.5 px-4">Contracts</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22314A]/60">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#93A4BD]">
                    No contractors added yet. Click &quot;Invite contractor&quot; to begin.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const badge = getStatusBadge(v.status);
                  const Icon = badge.icon;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVendor(v)}
                      className="hover:bg-[#22314A]/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#E8EEF7]">{v.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[#93A4BD]">
                        {maskAccount(v.wallet_address)}
                      </td>
                      <td className="py-3.5 px-4 text-[#93A4BD]">{v.contracts_count} contracts</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-[#34D399] hover:underline font-semibold text-[11px]">
                          View details &rarr;
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL M4: Invite Contractor */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111C30] border border-[#22314A] space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#E8EEF7]">Invite Contractor</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#93A4BD] hover:text-[#E8EEF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#93A4BD]">Contractor Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Apex Fuel Logistics"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs text-[#E8EEF7] focus:outline-none focus:border-[#34D399]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingInvite || !inviteName.trim()}
                  className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#0A1220] font-bold text-xs transition-colors disabled:opacity-50"
                >
                  {submittingInvite ? "Generating link..." : "Generate Invite Link"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#93A4BD]">
                  Share this invite link with your contractor. The link expires in 7 days.
                </p>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A1220] border border-[#22314A] font-mono text-xs">
                  <span className="truncate text-[#E8EEF7] mr-2">{generatedLink}</span>
                  <button
                    onClick={copyLink}
                    className="p-1 hover:text-[#34D399] transition-colors shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#34D399]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#22314A] hover:bg-[#22314A]/80 text-xs font-semibold text-[#E8EEF7]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vendor Drawer */}
      {selectedVendor && (
        <div className="fixed inset-0 z-40 bg-[#0A1220]/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full bg-[#111C30] border-l border-[#22314A] p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#22314A] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#E8EEF7]">{selectedVendor.name}</h3>
                  <div className="text-xs text-[#93A4BD]">Category: {selectedVendor.category}</div>
                </div>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="text-[#93A4BD] hover:text-[#E8EEF7]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#93A4BD]">Payout Account</div>
                <div className="p-3.5 rounded-xl bg-[#0A1220] border border-[#22314A] font-mono text-xs text-[#E8EEF7]">
                  {selectedVendor.wallet_address}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#93A4BD]">Status & Permissions</div>
                <div className="p-3.5 rounded-xl bg-[#0A1220] border border-[#22314A] text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#93A4BD]">Approval status:</span>
                    <span className="font-semibold text-[#E8EEF7]">{selectedVendor.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#93A4BD]">Payout account verified:</span>
                    <span className="font-semibold text-[#34D399]">
                      {selectedVendor.wallet_verified ? "Yes" : "Pending Review"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedVendor(null)}
              className="w-full py-2.5 rounded-xl bg-[#22314A] text-xs font-semibold text-[#E8EEF7]"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
