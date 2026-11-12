"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Sparkles,
  Bookmark,
  Check,
  ShieldAlert,
  ArrowRight,
  SlidersHorizontal,
  ExternalLink,
  Cpu,
  Battery,
  HardDrive,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Product {
  id: string;
  merchantId: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  availability?: string;
  specifications?: Record<string, string>;
}

export default function ShoppingPage() {
  const [searchQuery, setSearchQuery] = useState(
    "Find me a laptop for React Native development. I need 32GB RAM, good battery life and a budget of ₦1.2 million."
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Extracted Intent
  const [extractedIntent, setExtractedIntent] = useState<any>(null);

  // Prepare Checkout Modal
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<Product | null>(null);
  const [checkoutPreparation, setCheckoutPreparation] = useState<any>(null);
  const [approvedDisclosure, setApprovedDisclosure] = useState(false);
  const [isAuthorisedOnChain, setIsAuthorisedOnChain] = useState(false);
  const [nearTxHash, setNearTxHash] = useState<string | null>(null);

  async function loadSavedProducts() {
    try {
      const res = await fetch("/api/shopping/saved");
      const json = await res.json();
      if (json.success) {
        setSavedProductIds(json.savedProducts.map((p: any) => p.id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // 1. Send query to AI intent extraction & chat
      const aiRes = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: searchQuery, module: "shopping" }),
      });
      const aiJson = await aiRes.json();
      if (aiJson.success && aiJson.response?.extracted) {
        setExtractedIntent(aiJson.response.extracted);
      }

      // 2. Fetch products from merchant connector
      const maxPrice = aiJson.response?.extracted?.maxBudget;
      const url = `/api/shopping/search?query=${encodeURIComponent(
        searchQuery
      )}${maxPrice ? `&maxPrice=${maxPrice}` : ""}`;
      const prodRes = await fetch(url);
      const prodJson = await prodRes.json();
      if (prodJson.success) {
        setProducts(prodJson.products);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSavedProducts();
    handleSearch();
  }, []);

  async function handleToggleSave(product: Product) {
    const isSaved = savedProductIds.includes(product.id);
    if (isSaved) {
      await fetch(`/api/shopping/saved?productId=${product.id}`, { method: "DELETE" });
      setSavedProductIds((prev) => prev.filter((id) => id !== product.id));
    } else {
      await fetch("/api/shopping/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      setSavedProductIds((prev) => [...prev, product.id]);
    }
  }

  function handleToggleComparison(id: string) {
    setSelectedForComparison((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        alert("You can compare up to 3 products at a time.");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function runComparison() {
    if (selectedForComparison.length < 2) {
      alert("Please select at least 2 products to compare.");
      return;
    }
    setIsComparing(true);
    try {
      const res = await fetch("/api/shopping/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedForComparison }),
      });
      const json = await res.json();
      if (json.success) {
        setComparisonData(json.comparison);
      }
    } catch (e) {
      console.error("Comparison failed:", e);
    }
  }

  async function openPrepareCheckout(product: Product) {
    setActiveCheckoutProduct(product);
    setApprovedDisclosure(false);
    setIsAuthorisedOnChain(false);
    setNearTxHash(null);

    try {
      const res = await fetch("/api/shopping/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const json = await res.json();
      if (json.success) {
        setCheckoutPreparation(json.preparation);
      }
    } catch (err) {
      console.error("Failed to prepare purchase:", err);
    }
  }

  async function handleApproveDisclosureAndNearRecord() {
    if (!activeCheckoutProduct || !checkoutPreparation) return;

    // 1. Record approved disclosure in privacy policy engine
    await fetch("/api/privacy/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: checkoutPreparation.merchantName,
        purpose: "Checkout delivery and contact verification",
        permittedFields: checkoutPreparation.requiredFields,
        expiresInHours: 72,
      }),
    });
    setApprovedDisclosure(true);

    // 2. Record on-chain permission on NEAR Testnet contract
    const nearRes = await fetch("/api/near/authorisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: `CHECKOUT_${activeCheckoutProduct.merchantId.toUpperCase()}`,
        spendingLimit: activeCheckoutProduct.price,
        currency: activeCheckoutProduct.currency,
        expirySeconds: 86400 * 3,
      }),
    });
    const nearJson = await nearRes.json();
    if (nearJson.success) {
      setIsAuthorisedOnChain(true);
      setNearTxHash(nearJson.record.transactionHash);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-400" />
            <span>Private Product Discovery & Checkout</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search multi-merchant tech catalogs using private intent extraction without sharing your browsing identity.
          </p>
        </div>

        {selectedForComparison.length >= 2 && (
          <button
            onClick={runComparison}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Scale className="w-4 h-4" />
            <span>Compare ({selectedForComparison.length}) Products</span>
          </button>
        )}
      </div>

      {/* Natural Language Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center rounded-2xl bg-slate-950 border border-slate-800 p-2 shadow-2xl focus-within:border-emerald-500 transition">
          <div className="pl-3 pr-2 text-slate-500">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Find me a laptop for React Native development. 32GB RAM, good battery, under ₦1.2M"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none px-2 py-1.5"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shrink-0 flex items-center gap-1.5"
          >
            {loading ? (
              <span className="animate-spin">◌</span>
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Analyze & Search</span>
          </button>
        </div>
      </form>

      {/* Extracted Intent Badge Card */}
      {extractedIntent && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
              Extracted Intent
            </span>
            <span className="text-slate-300 font-semibold">{extractedIntent.useCase}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-slate-400">
            {extractedIntent.targetSpecs?.ram && (
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">
                RAM: {extractedIntent.targetSpecs.ram}
              </span>
            )}
            {extractedIntent.targetSpecs?.battery && (
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">
                Battery: {extractedIntent.targetSpecs.battery}
              </span>
            )}
            {extractedIntent.maxBudget && (
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-emerald-400 font-mono">
                Cap: {formatCurrency(extractedIntent.maxBudget)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const isSaved = savedProductIds.includes(product.id);
          const isSelected = selectedForComparison.includes(product.id);

          return (
            <div
              key={product.id}
              className={`rounded-2xl bg-slate-950 border transition flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-2xl ${
                isSelected ? "border-cyan-500 ring-1 ring-cyan-500" : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                {/* Image & Badges */}
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover transition duration-300 hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur text-emerald-400 border border-emerald-500/20">
                      {product.merchantId.replace("_", " ")}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur text-slate-300 border border-slate-700">
                      {product.availability}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleSave(product)}
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur transition ${
                      isSaved
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-950/70 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                    {product.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>

                  {/* Specifications snippet */}
                  {product.specifications && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{product.specifications["RAM"]}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{product.specifications["Storage"]}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Battery className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{product.specifications["Battery"]}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Actions */}
              <div className="p-5 pt-0 space-y-3 border-t border-slate-900">
                <div className="flex items-baseline justify-between pt-3">
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {formatCurrency(product.price, product.currency)}
                  </div>
                  <button
                    onClick={() => handleToggleComparison(product.id)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    {isSelected ? "Comparing ✓" : "+ Compare"}
                  </button>
                </div>

                <button
                  onClick={() => openPrepareCheckout(product)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-slate-100 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-slate-800 hover:border-emerald-500"
                >
                  <span>Prepare Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Modal */}
      {isComparing && comparisonData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Side-by-Side Product Comparison</h3>
              </div>
              <button
                onClick={() => setIsComparing(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Highlights */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
              {comparisonData.comparisonHighlights.map((hl: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>

            {/* Specification Matrix Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Specification</th>
                    {comparisonData.products.map((p: any) => (
                      <th
                        key={p.id}
                        className={`px-4 py-3 text-left font-semibold ${
                          p.id === comparisonData.recommendedId ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {p.title.split("(")[0]}
                        {p.id === comparisonData.recommendedId && (
                          <span className="block text-[10px] text-emerald-400 font-mono">
                            ★ Recommended Pick
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-400">Price</td>
                    {comparisonData.products.map((p: any) => (
                      <td key={p.id} className="px-4 py-3 font-mono font-bold text-white">
                        {formatCurrency(p.price, p.currency)}
                      </td>
                    ))}
                  </tr>
                  {Object.keys(comparisonData.specificationMatrix).map((specKey) => (
                    <tr key={specKey}>
                      <td className="px-4 py-3 font-semibold text-slate-400">{specKey}</td>
                      {comparisonData.products.map((p: any) => (
                        <td key={p.id} className="px-4 py-3">
                          {comparisonData.specificationMatrix[specKey]?.[p.title] || "N/A"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsComparing(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prepare Checkout & Disclosure Approval Modal */}
      {activeCheckoutProduct && checkoutPreparation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full max-w-xl space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Controlled Checkout Disclosure</h3>
              </div>
              <button
                onClick={() => setActiveCheckoutProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Product summary */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">{activeCheckoutProduct.title}</h4>
                  <span className="text-xs text-slate-400">
                    Merchant: {checkoutPreparation.merchantName}
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {formatCurrency(checkoutPreparation.subtotal, checkoutPreparation.currency)}
                </div>
              </div>
            </div>

            {/* Privacy Boundary & Field Checklist */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Data Boundary Policy
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                {checkoutPreparation.disclosureNotice}
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <div className="text-slate-400">Fields to be disclosed upon your explicit approval:</div>
                <div className="flex flex-wrap gap-2">
                  {checkoutPreparation.requiredFields.map((field: string) => (
                    <span
                      key={field}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-[11px]"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Confirmation & NEAR Hash */}
            {isAuthorisedOnChain ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Disclosure Approved & NEAR Testnet Authorisation Confirmed</span>
                </div>
                <p className="text-slate-300">
                  A cryptographic permission hash was immutably recorded to{" "}
                  <code className="text-cyan-300 font-mono">obligo-permissions.testnet</code>.
                </p>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400 truncate">
                  Tx Hash: {nearTxHash}
                </div>
                <div className="pt-2 flex justify-end">
                  <a
                    href={checkoutPreparation.checkoutHandoffUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <span>Proceed to Merchant Checkout Handoff</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveCheckoutProduct(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveDisclosureAndNearRecord}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Approve & Sign NEAR Authorisation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
