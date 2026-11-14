"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  Coins,
  CheckCircle2,
  ChevronDown,
  LogOut,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  X,
  Globe,
  Smartphone,
  Sparkles,
  QrCode,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";

interface WalletProviderOption {
  id: string;
  name: string;
  subtitle: string;
  type: "injected" | "web" | "mobile" | "sandbox";
  iconUrl?: string;
  badge?: string;
  isInstalled?: boolean;
}

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [nearAccount, setNearAccount] = useState<string>("obligoo.near");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"wallets" | "assets">("wallets");
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [walletConnectModal, setWalletConnectModal] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && walletModalOpen) {
        setWalletModalOpen(false);
        setWalletConnectModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [walletModalOpen]);

  // Injected wallet detection flags
  const [hasMeteor, setHasMeteor] = useState(false);
  const [hasSender, setHasSender] = useState(false);
  const [hasNightly, setHasNightly] = useState(false);
  const [hasHere, setHasHere] = useState(false);
  const [hasEthereum, setHasEthereum] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasMeteor(Boolean((window as any).meteorWallet));
      setHasSender(Boolean((window as any).near?.isSender || (window as any).near));
      setHasNightly(Boolean((window as any).nightly?.near));
      setHasHere(Boolean((window as any).hereWallet));
      setHasEthereum(Boolean((window as any).ethereum));
    }
  }, [walletModalOpen]);

  // Load account from localStorage or default
  useEffect(() => {
    const saved = localStorage.getItem("near_connected_account");
    if (saved) {
      setNearAccount(saved);
    }
  }, []);

  // Fetch live discovered assets whenever nearAccount changes
  async function loadWalletAssets(account: string) {
    if (!account) return;
    setLoadingAssets(true);
    try {
      // The generic shell only manages the connected NEAR account. Payment
      // balances are read by the payer/settlement flows.
      setAssets([]);
    } catch (e) {
      console.error("Failed to load assets:", e);
    } finally {
      setLoadingAssets(false);
    }
  }

  useEffect(() => {
    loadWalletAssets(nearAccount);
  }, [nearAccount]);

  function handleConnectAccount(newAccount: string) {
    if (!newAccount.trim()) return;
    const clean = newAccount.trim().toLowerCase();
    setNearAccount(clean);
    localStorage.setItem("near_connected_account", clean);
    setCustomInput("");
    setWalletModalOpen(false);
  }

  function handleDisconnect() {
    setNearAccount("");
    localStorage.removeItem("near_connected_account");
    setAssets([]);
    setWalletModalOpen(false);
  }

  function copyAddress() {
    if (!nearAccount) return;
    navigator.clipboard.writeText(nearAccount);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSelectProvider(providerId: string) {
    setConnectingWalletId(providerId);

    try {
      if (providerId === "sandbox") {
        handleConnectAccount("obligoo.near");
        return;
      }

      if (providerId === "walletconnect") {
        setWalletConnectModal(true);
        return;
      }

      if (providerId === "mynearwallet") {
        // Offer interactive prompt or connect
        const entered = window.prompt("Enter your mainnet NEAR account ID (e.g. company.near):", nearAccount || "company.near");
        if (entered) {
          handleConnectAccount(entered);
        }
        return;
      }

      // Injected browser extensions (Meteor / Sender / Nightly)
      if (typeof window !== "undefined") {
        const win = window as any;

        if (providerId === "meteor" && win.meteorWallet) {
          try {
            const res = await win.meteorWallet.requestSignIn({
              contractId: "obligoo.near",
            });
            if (res?.accountId) {
              handleConnectAccount(res.accountId);
              return;
            }
          } catch (err) {
            console.warn("Meteor connect canceled:", err);
          }
        }

        if ((providerId === "sender" || providerId === "meteor") && win.near) {
          try {
            const res = await win.near.requestSignIn({
              contractId: "obligoo.near",
            });
            if (res?.accountId) {
              handleConnectAccount(res.accountId);
              return;
            }
            if (win.near.getAccountId && win.near.getAccountId()) {
              handleConnectAccount(win.near.getAccountId());
              return;
            }
          } catch (err) {
            console.warn("Sender connect canceled:", err);
          }
        }

        if (providerId === "injected_evm" && win.ethereum) {
          try {
            const accounts = await win.ethereum.request({ method: "eth_requestAccounts" });
            if (accounts && accounts[0]) {
              handleConnectAccount(accounts[0]);
              return;
            }
          } catch (err) {
            console.warn("EVM connect canceled:", err);
          }
        }
      }

      // Fallback: prompt for account
      const fallbackPrompt = window.prompt(`Enter your ${providerId} account name (e.g. company.near):`);
      if (fallbackPrompt) {
        handleConnectAccount(fallbackPrompt);
      }
    } finally {
      setConnectingWalletId(null);
    }
  }

  const nearAsset = assets.find((a) => a.tokenSymbol === "NEAR");

  const walletProviders: WalletProviderOption[] = [
    {
      id: "mynearwallet",
      name: "MyNearWallet",
      subtitle: "Official NEAR web wallet (Testnet & Mainnet)",
      type: "web",
      badge: "Popular Web",
    },
    {
      id: "meteor",
      name: "Meteor Wallet",
      subtitle: hasMeteor ? "Detected in your browser extension" : "Fast NEAR browser extension & web wallet",
      type: "injected",
      isInstalled: hasMeteor,
      badge: hasMeteor ? "Installed" : "Browser Extension",
    },
    {
      id: "sender",
      name: "Sender Wallet",
      subtitle: hasSender ? "Detected in your browser extension" : "Secure non-custodial browser wallet",
      type: "injected",
      isInstalled: hasSender,
      badge: hasSender ? "Installed" : "Browser Extension",
    },
    {
      id: "nightly",
      name: "Nightly Wallet",
      subtitle: hasNightly ? "Detected in your browser extension" : "Multi-chain extension for NEAR Protocol",
      type: "injected",
      isInstalled: hasNightly,
      badge: hasNightly ? "Installed" : "Extension",
    },
    {
      id: "walletconnect",
      name: "WalletConnect",
      subtitle: "Scan QR code with your mobile wallet app",
      type: "mobile",
      badge: "Mobile QR",
    },
    {
      id: "injected_evm",
      name: "MetaMask / Browser Injected",
      subtitle: hasEthereum ? "Detected browser Web3 provider" : "Connect via browser injected Ethereum/EVM wallet",
      type: "injected",
      isInstalled: hasEthereum,
      badge: hasEthereum ? "Detected" : "Web3 Injected",
    },
    {
      id: "sandbox",
      name: "Funded Testnet Sandbox (Demo)",
      subtitle: "obligoo.near • NEAR Mainnet",
      type: "sandbox",
      badge: "Pre-Funded",
    },
  ];

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>NEARbligo Invoice Payments</span>
        </span>
      </div>

      <div className="flex items-center space-x-3 text-xs">
        {/* NEAR Testnet Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
          <Layers className="w-3 h-3 text-[#00EC97]" />
          <span>NEAR permissions</span>
        </div>

        {/* Connect NEAR Wallet Button */}
        {nearAccount ? (
          <button
            onClick={() => {
              setActiveTab("wallets");
              setWalletModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-medium transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-[#00EC97]" />
            <Coins className="w-3.5 h-3.5 text-[#00EC97]" />
            <span className="font-mono text-xs font-semibold">{nearAccount}</span>
            {nearAsset && (
              <span className="px-1.5 py-0.5 rounded bg-[#00EC97]/15 text-[#00EC97] font-mono text-[11px] font-bold">
                {nearAsset.balance} NEAR
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <button
            onClick={() => {
              setActiveTab("wallets");
              setWalletModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#00EC97] hover:bg-[#00D989] text-[#0A0E17] font-bold transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>

      {/* Wallet Management Modal rendered via Portal directly to body (escapes any parent stacking contexts) */}
      {mounted && walletModalOpen && createPortal(
        <div
          onClick={() => {
            setWalletModalOpen(false);
            setWalletConnectModal(false);
          }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col z-[10000]"
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Web3 Wallet</h3>
                    <p className="text-xs text-slate-400">NEAR account for invoice settlement</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setWalletModalOpen(false);
                  setWalletConnectModal(false);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Account Banner */}
            {nearAccount && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Account</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-white truncate max-w-[220px]">
                    {nearAccount}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={copyAddress}
                    title="Copy Address"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[10px]">{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <a
                    href={`https://nearblocks.io/address/${nearAccount}`}
                    target="_blank"
                    rel="noreferrer"
                    title="View on NEAR Explorer"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Tab Selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("wallets")}
                className={`py-2 rounded-lg transition-all ${
                  activeTab === "wallets"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Available Wallets
              </button>
              <button
                onClick={() => setActiveTab("assets")}
                className={`py-2 rounded-lg transition-all ${
                  activeTab === "assets"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Discovered Assets ({assets.length})
              </button>
            </div>

            {/* Tab Content: Available Wallets */}
            {activeTab === "wallets" && (
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[46vh]">
                {walletConnectModal ? (
                  /* WalletConnect QR Simulator */
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-cyan-400" /> Scan with Mobile Wallet
                      </span>
                      <button
                        onClick={() => setWalletConnectModal(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Back
                      </button>
                    </div>
                    <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl flex items-center justify-center shadow-lg">
                      <div className="w-full h-full border-4 border-dashed border-slate-900 rounded-xl flex flex-col items-center justify-center text-slate-900">
                        <QrCode className="w-16 h-16 text-slate-800 mb-1" />
                        <span className="text-[10px] font-mono font-bold">NEAR Protocol</span>
                        <span className="text-[9px] text-slate-500 font-mono">NEAR Mainnet</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Open a supported NEAR wallet on your phone to scan and authorize.
                    </p>
                    <button
                      onClick={() => {
                        handleConnectAccount("obligoo.near");
                        setWalletConnectModal(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-white transition-all"
                    >
                      Use Connected Testnet Account
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Select a Wallet
                      </div>

                      <div className="space-y-2">
                        {walletProviders.map((provider) => {
                          const isCurrent = nearAccount === "obligoo.near" && provider.id === "sandbox";
                          return (
                            <button
                              key={provider.id}
                              onClick={() => handleSelectProvider(provider.id)}
                              disabled={connectingWalletId === provider.id}
                              className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                                isCurrent
                                  ? "bg-emerald-500/10 border-emerald-500/40"
                                  : "bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition-colors">
                                  {provider.type === "mobile" ? (
                                    <Smartphone className="w-4 h-4" />
                                  ) : provider.type === "web" ? (
                                    <Globe className="w-4 h-4" />
                                  ) : provider.type === "sandbox" ? (
                                    <Sparkles className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Wallet className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-2">
                                    <span>{provider.name}</span>
                                    {provider.badge && (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                          provider.isInstalled
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : provider.type === "sandbox"
                                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                            : "bg-slate-800 text-slate-400"
                                        }`}
                                      >
                                        {provider.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                    {provider.subtitle}
                                  </div>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Manual Account Entry */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <span>Direct Account Connection</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder="e.g. yourname.near"
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleConnectAccount(customInput)}
                          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab Content: Discovered Assets */}
            {activeTab === "assets" && (
              <div className="space-y-3 overflow-y-auto pr-1 max-h-[46vh]">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Live Balances (near-api-js RPC)</span>
                  <button
                    onClick={() => loadWalletAssets(nearAccount)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingAssets ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {loadingAssets ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-400" />
                    <p>Checking connected NEAR account...</p>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <Coins className="w-6 h-6 mx-auto text-slate-600" />
                    <p>No token balances found for this account.</p>
                    <button
              onClick={() => handleConnectAccount("obligoo.near")}
                      className="text-cyan-400 hover:underline text-[11px] block mx-auto mt-1"
                    >
                      Connect a NEAR account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assets.map((asset, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                            {asset.tokenSymbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-white">{asset.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-mono">
                              {asset.blockchain} • {asset.isNative ? "Native" : "NEP-141"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white font-mono text-sm">
                            {asset.balance} {asset.tokenSymbol}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            ${asset.valueUsd.toFixed(2)} USD
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer / Disconnect Action */}
            {nearAccount && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Connected to NEAR</span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 py-1 transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
