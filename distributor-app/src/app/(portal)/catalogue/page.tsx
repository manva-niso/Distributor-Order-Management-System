"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Store,
  Wallet,
  Percent,
  Gift,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Minus,
  MessageSquare,
  LogOut,
  RefreshCw,
  Building2,
} from "lucide-react";
import { SeedSku } from "@/db/seed-data";
import { CartItem, calculateCartTotals, calculateLineItem } from "@/lib/catalogue/cart-store";
import {
  getCartStorageKey,
  parseStoredCart,
  DraftCartItem,
  loadScopedCart,
  saveScopedCart,
} from "@/lib/catalogue/cart-storage";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLiveStock } from "@/lib/catalogue/useLiveStock";
import { TRADE_DICT, getSkuDisplay, getRetailerDisplay, Language } from "@/lib/i18n/trade-dict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface RetailerHeader {
  id: string;
  name: string;
  nameHi?: string;
  ownerName: string;
  ownerNameHi?: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  creditHold: boolean;
  route: string;
  routeHi?: string;
}

export default function CataloguePage() {
  const router = useRouter();
  const { stockMap, stockVersion, getStock, isOutOfStock: checkOutOfStock, recentChanges } = useLiveStock();

  // Global synchronized language state
  const { lang, setLang } = useLanguage();
  const [userRole, setUserRole] = useState<string>("retailer");
  const [retailer, setRetailer] = useState<RetailerHeader | null>(null);
  const [skus, setSkus] = useState<SeedSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [cartMap, setCartMap] = useState<Record<string, DraftCartItem>>({});
  const [notifiedSkus, setNotifiedSkus] = useState<Record<string, boolean>>({});

  // Synchronize live stock updates from warehouse into local catalogue state
  useEffect(() => {
    if (Object.keys(stockMap).length > 0) {
      setSkus((prevSkus) =>
        prevSkus.map((s) => {
          const liveCases = stockMap[s.id];
          if (liveCases !== undefined && s.stockCases !== liveCases) {
            return { ...s, stockCases: liveCases };
          }
          return s;
        })
      );
    }
  }, [stockMap]);

  // 1. Load Catalogue & Retailer Session
  useEffect(() => {
    // Immediate optimistic draft cart load for 0ms initial render
    setCartMap(loadScopedCart());

    fetch("/api/catalogue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSkus(data.skus || []);
          setRetailer(data.retailer || null);
          if (data.retailer?.id) {
            try {
              localStorage.setItem("isolabs_current_retailer_id", data.retailer.id);
            } catch {}
            setCartMap(loadScopedCart(data.retailer.id));
          }
          if (data.userRole) {
            setUserRole(data.userRole);
          }
        }
      })
      .catch((err) => console.error("Failed to load catalogue:", err))
      .finally(() => setLoading(false));
  }, []);

  // Sync cart changes to scoped localStorage for both wholesale cases and loose packets
  const updateCartQty = (skuId: string, field: "cases" | "packs", delta: number) => {
    const liveAvailable = getStock(skuId, 9999);
    setCartMap((prev) => {
      const current = prev[skuId] || { cases: 0, packs: 0 };
      let nextVal = Math.max(0, (current[field] || 0) + delta);
      // Clamp whole cases to available warehouse stock
      if (field === "cases" && delta > 0 && nextVal > liveAvailable) {
        nextVal = liveAvailable;
      }
      const updatedEntry = { ...current, [field]: nextVal };
      const updated = { ...prev };
      if (updatedEntry.cases === 0 && updatedEntry.packs === 0) {
        delete updated[skuId];
      } else {
        updated[skuId] = updatedEntry;
      }
      saveScopedCart(updated, retailer?.id);
      return updated;
    });
  };

  // Convert cartMap into calculated CartItems
  const cartItems: CartItem[] = useMemo(() => {
    return skus.map((s) => {
      const entry = cartMap[s.id] || { cases: 0, packs: 0 };
      return {
        ...s,
        quantityCases: entry.cases,
        quantityPacks: entry.packs,
      };
    });
  }, [skus, cartMap]);

  const totals = useMemo(() => {
    return calculateCartTotals(cartItems);
  }, [cartItems]);

  // Search & Filter
  const filteredSkus = useMemo(() => {
    return skus.filter((item) => {
      const matchesBrand = selectedBrand === "ALL" || item.brand.toUpperCase() === selectedBrand.toUpperCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchesBrand && matchesSearch;
    });
  }, [skus, selectedBrand, searchQuery]);

  // Brand Chips
  const brands = useMemo(() => {
    const list = Array.from(new Set(skus.map((s) => s.brand)));
    return ["ALL", ...list];
  }, [skus]);

  // Handle Out of Stock Restock Notification
  const handleNotifyRestock = async (sku: SeedSku) => {
    try {
      setNotifiedSkus((prev) => ({ ...prev, [sku.id]: true }));
      await fetch("/api/catalogue/notify-restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skuId: sku.id }),
      });
    } catch {
      // Keep optimistic feedback
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const t = TRADE_DICT[lang];
  const retailerDisplay = retailer ? getRetailerDisplay(retailer, lang) : null;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans antialiased">
      <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl min-h-screen bg-slate-50 flex flex-col md:shadow-xl md:border-x md:border-slate-200/80 pb-36 relative">
        {/* Top Fixed Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        {userRole === "desk" && (
          <div className="bg-emerald-950 text-white px-4 py-2 border-b border-emerald-900">
            <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Order Desk View (Managing Catalog)</span>
              </div>
              <Link
                href="/desk"
                className="px-2.5 py-1 bg-white text-emerald-950 text-[11px] font-bold rounded shadow-xs hover:bg-slate-100"
              >
                ← Back to Desk
              </Link>
            </div>
          </div>
        )}
        {/* Row 1: Brand, Account & Language */}
        <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              A
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm leading-none">
                  {lang === "hi" ? "कंपनी ए" : "Company A"}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {lang === "hi" ? "जबलपुर" : "Jabalpur"}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-800 truncate">
                {retailerDisplay ? retailerDisplay.name : (lang === "hi" ? "शर्मा किराना स्टोर" : "Sharma Kirana")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`h-7 px-2 rounded text-xs font-bold transition-all ${
                  lang === "en" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`h-7 px-2 rounded text-xs font-bold transition-all ${
                  lang === "hi" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
                }`}
              >
                हिन्दी
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="w-8 h-8 rounded-lg text-slate-500 hover:text-red-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Credit Headroom & Route Strip */}
        <div className="bg-slate-100/80 border-t border-slate-200 px-4 py-1.5">
          <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-slate-600">
              <Wallet className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === "hi" ? "उपलब्ध उधार: " : "Credit Headroom: "}</span>
              <strong className="text-emerald-800 font-bold font-mono">
                ₹{retailer ? retailer.availableCredit.toLocaleString("en-IN") : "38,000"}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px] truncate">
                {retailerDisplay?.route || (lang === "hi" ? "नेपियर टाउन रूट #4" : "Napier Town Route #4")}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live v{stockVersion}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Container */}
      <main className="max-w-md md:max-w-5xl lg:max-w-6xl w-full mx-auto px-4 pt-3 flex flex-col gap-3.5">
        {/* Quick Order (AI) Promo Action Card */}
        <Link
          href="/quick-order"
          className="bg-emerald-800 text-white rounded-xl p-3 shadow-sm flex items-center justify-between gap-3 hover:bg-emerald-900 transition-all select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-700/80 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                {lang === "hi" ? "व्हाट्सएप / बोलकर आर्डर" : "WhatsApp or Voice Order"}
              </span>
              <span className="text-sm font-semibold truncate">
                {lang === "hi" ? "मैसेज या पर्ची फोटो से आर्डर करें" : "Order in 1 minute using AI"}
              </span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-300 shrink-0" />
        </Link>

        {/* Search Input (48px Touch Area) */}
        <div className="relative flex items-center w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "hi" ? "सामान या ब्रांड खोजें..." : "Search biscuit, detergent, tea..."}
            className="w-full h-12 pl-10 pr-4 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 shadow-2xs"
          />
        </div>

        {/* Brand Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {brands.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setSelectedBrand(b)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedBrand === b
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {b === "ALL" ? (lang === "hi" ? "सभी ब्रांड (All)" : "All Brands") : b}
            </button>
          ))}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3 py-6 items-center justify-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
            <span className="text-xs font-semibold">
              {lang === "hi" ? "कैटलॉग लोड हो रहा है..." : "Loading wholesale inventory..."}
            </span>
          </div>
        )}

        {/* SKU Cards Grid / Vertical List */}
        {!loading && filteredSkus.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 my-4">
            <Store className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <div className="font-bold text-sm text-slate-800">
              {lang === "hi" ? "कोई सामान नहीं मिला" : "No matching products found"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === "hi" ? "कृपया दूसरा नाम या ब्रांड खोजें।" : "Try clearing your search query or filters."}
            </p>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSkus.map((sku) => {
              const currentEntry = cartMap[sku.id] || { cases: 0, packs: 0 };
              const liveStockCases = getStock(sku.id, sku.stockCases);
              const isOutOfStock = !sku.active || liveStockCases <= 0;
              const skuDisplay = getSkuDisplay(sku, lang);
              const lineCalc = calculateLineItem({
                ...sku,
                stockCases: liveStockCases,
                quantityCases: currentEntry.cases,
                quantityPacks: currentEntry.packs,
              });

              return (
                <article
                  key={sku.id}
                  className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 transition-all ${
                    isOutOfStock ? "border-slate-200 bg-slate-50/70" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Title, Brand, Code & Stock Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                            {skuDisplay.brand} • {sku.code}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900 leading-snug">{skuDisplay.name}</h2>
                        <span className="text-xs text-slate-500">
                          {lang === "hi"
                            ? `${sku.unitsPerCase} पैकेट की पेटी (${sku.packSize})`
                            : `Case of ${sku.unitsPerCase} packs (${sku.packSize})`}
                        </span>
                      </div>

                      {/* Stock Status Badge */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {recentChanges.has(sku.id) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold animate-pulse">
                            ⚡ {lang === "hi" ? "अपडेट हुआ" : "Just Updated"}
                          </span>
                        )}
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-800 text-[11px] font-bold">
                            {t.outOfStock}
                          </span>
                        ) : liveStockCases <= 20 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            {t.casesLeft(liveStockCases)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            {t.inStock(liveStockCases)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown Strip (Ex-GST Dealer Rate + Single Pack Rate + GST Badge) */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-baseline justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold font-mono text-slate-900">
                            ₹{sku.dealerPrice.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{t.perCase}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {t.singlePackRate} <strong>₹{sku.packPrice.toFixed(2)}</strong> • {t.exGst}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider font-mono">
                          +{sku.gstRate}% GST
                        </span>
                        <span className="block text-[11px] text-slate-600 font-semibold mt-0.5 font-mono">
                          ₹{((sku.dealerPrice * (1 + sku.gstRate / 100))).toFixed(2)} {t.inclTax}
                        </span>
                      </div>
                    </div>

                    {/* Active Trade Scheme Pill */}
                    {sku.schemeType === "FREE_GOODS" && sku.schemeDetail?.buyQty && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2 text-xs text-amber-900 font-semibold leading-relaxed">
                        <Gift className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          {lang === "hi"
                            ? `★ ${sku.schemeDetail.buyQty} पेटी पर ${sku.schemeDetail.getFreeQty} पेटी बिल्कुल मुफ्त!`
                            : `★ Buy ${sku.schemeDetail.buyQty} cases, get ${sku.schemeDetail.getFreeQty} case FREE!`}
                        </span>
                      </div>
                    )}

                    {sku.schemeType === "SLAB_DISCOUNT" && sku.schemeDetail?.minCases && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2 text-xs text-amber-900 font-semibold leading-relaxed">
                        <Percent className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          {lang === "hi"
                            ? `★ ${sku.schemeDetail.minCases} या अधिक पेटी पर ${sku.schemeDetail.discountPct}% थोक छूट!`
                            : `★ ${sku.schemeDetail.discountPct}% discount on ${sku.schemeDetail.minCases}+ cases!`}
                        </span>
                      </div>
                    )}

                    {/* Dynamic Scheme Alert / Threshold Nudge */}
                    {!isOutOfStock && currentEntry.cases > 0 && (
                      <>
                        {sku.schemeType === "FREE_GOODS" && (
                          <div
                            className={`rounded-lg p-2 text-xs flex items-center gap-2 font-bold ${
                              lineCalc.freeCases > 0
                                ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <Gift className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div>
                              {lineCalc.freeCases > 0 ? (
                                <span>
                                  {lang === "hi"
                                    ? `🎉 +${lineCalc.freeCases} मुफ्त पेटी अनलॉक! (कुल ${currentEntry.cases + lineCalc.freeCases} पेटी डिलीवर होंगी)`
                                    : `🎉 ${lineCalc.freeCases} Free Case${lineCalc.freeCases > 1 ? "s" : ""} Unlocked! (Total: ${currentEntry.cases + lineCalc.freeCases} cases delivered)`}
                                </span>
                              ) : (
                                <span>
                                  {lang === "hi"
                                    ? `1 मुफ्त पेटी हेतु ${(sku.schemeDetail?.buyQty || 10) - currentEntry.cases} और पेटी जोड़ें`
                                    : `Add ${(sku.schemeDetail?.buyQty || 10) - currentEntry.cases} more cases to earn 1 FREE case!`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {sku.schemeType === "SLAB_DISCOUNT" && (
                          <div
                            className={`rounded-lg p-2 text-xs flex items-center gap-2 font-bold ${
                              lineCalc.discountAmount > 0
                                ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <Percent className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div>
                              {lineCalc.discountAmount > 0 ? (
                                <span>
                                  {lang === "hi"
                                    ? `✓ ${sku.schemeDetail?.discountPct}% थोक छूट लागू! बचत: -₹${lineCalc.discountAmount.toFixed(2)}`
                                    : `✓ ${sku.schemeDetail?.discountPct}% Wholesale Discount Applied! Saved -₹${lineCalc.discountAmount.toFixed(2)}`}
                                </span>
                              ) : (
                                <span>
                                  {lang === "hi"
                                    ? `${sku.schemeDetail?.discountPct}% छूट हेतु ${(sku.schemeDetail?.minCases || 5) - currentEntry.cases} और पेटी जोड़ें`
                                    : `Add ${(sku.schemeDetail?.minCases || 5) - currentEntry.cases} more cases to unlock ${sku.schemeDetail?.discountPct}% slab cash rebate!`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Quantity Action Section: Dual Stepper for Wholesale Cases & Loose Packs */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          {lang === "hi" ? "आर्डर कुल (GST सहित)" : "Line Total (Incl. GST)"}
                        </span>
                        <span className="text-base font-bold font-mono text-slate-900">
                          ₹{lineCalc.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {(currentEntry.cases > 0 || currentEntry.packs > 0) && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {currentEntry.cases > 0 && `${currentEntry.cases} ${lang === "hi" ? "पेटी" : "Case(s)"}`}
                          {currentEntry.cases > 0 && currentEntry.packs > 0 && " + "}
                          {currentEntry.packs > 0 && `${currentEntry.packs} ${lang === "hi" ? "पैकेट" : "Pack(s)"}`}
                        </span>
                      )}
                    </div>

                    {isOutOfStock ? (
                      <button
                        type="button"
                        disabled={notifiedSkus[sku.id]}
                        onClick={() => handleNotifyRestock(sku)}
                        className={`w-full min-h-[48px] rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          notifiedSkus[sku.id]
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                        }`}
                      >
                        {notifiedSkus[sku.id] ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>
                              {lang === "hi"
                                ? "✓ सूचना सेट हो गई (Notification Set)"
                                : "✓ Alert set on WhatsApp when stock arrives"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 text-slate-500" />
                            <span>{t.notifyWhenRestocked}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Master Case Stepper */}
                        <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1 mb-1">
                            <span>{lang === "hi" ? "पेटी" : "Master Case"}</span>
                            <span className="font-mono text-slate-500 text-[10px]">₹{sku.dealerPrice.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
                            <button
                              type="button"
                              aria-label="Decrease cases"
                              disabled={currentEntry.cases <= 0}
                              onClick={() => updateCartQty(sku.id, "cases", -1)}
                              className="w-10 h-10 rounded bg-slate-100 text-slate-900 flex items-center justify-center active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {currentEntry.cases}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase cases"
                              disabled={currentEntry.cases >= liveStockCases}
                              onClick={() => updateCartQty(sku.id, "cases", 1)}
                              className="w-10 h-10 rounded bg-emerald-700 text-white flex items-center justify-center active:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Loose Pack Stepper */}
                        <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1 mb-1">
                            <span>{lang === "hi" ? "खुले पैकेट" : "Loose Pack"}</span>
                            <span className="font-mono text-slate-500 text-[10px]">₹{sku.packPrice.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
                            <button
                              type="button"
                              aria-label="Decrease loose packs"
                              disabled={currentEntry.packs <= 0}
                              onClick={() => updateCartQty(sku.id, "packs", -1)}
                              className="w-10 h-10 rounded bg-slate-100 text-slate-900 flex items-center justify-center active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {currentEntry.packs}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase loose packs"
                              onClick={() => updateCartQty(sku.id, "packs", 1)}
                              className="w-10 h-10 rounded bg-slate-800 text-white flex items-center justify-center active:bg-slate-900 cursor-pointer transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Cart Bar (Appears when items are selected for retailers/salesmen) */}
      {userRole !== "desk" && (totals.totalCases > 0 || totals.totalPacks > 0) && (
        <aside className="fixed bottom-16 inset-x-0 z-40 bg-transparent pointer-events-none p-3">
          <div className="max-w-md md:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-between gap-3 bg-slate-900 text-white p-3 shadow-xl rounded-xl pointer-events-auto border border-slate-700/60">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold truncate flex-wrap">
                <span>{totals.itemCount} {lang === "hi" ? "सामान" : "Items"}</span>
                <span>•</span>
                {totals.totalCases > 0 && <span>{totals.totalCases} {lang === "hi" ? "पेटी" : "Cases"}</span>}
                {totals.totalCases > 0 && totals.totalPacks > 0 && <span>+</span>}
                {totals.totalPacks > 0 && <span>{totals.totalPacks} {lang === "hi" ? "पैकेट" : "Packs"}</span>}
                {totals.totalFreeCases > 0 && (
                  <span className="text-amber-400 font-bold shrink-0">
                    (+{totals.totalFreeCases} {lang === "hi" ? "मुफ्त" : "Free"})
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold font-mono text-white">
                  ₹{totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {lang === "hi" ? "जीएसटी सहित" : "Incl. GST"}
                </span>
              </div>
            </div>

            <Link
              href="/cart"
              className="min-h-[48px] px-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <span>{lang === "hi" ? "कार्ट देखें" : "View Cart"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </aside>
      )}

      {/* Bottom Navigation */}
      {userRole !== "desk" ? (
        <BottomNav cartItemCount={totals.totalCases + (totals.totalPacks > 0 ? 1 : 0)} lang={lang} />
      ) : (
        <div className="fixed bottom-0 inset-x-0 bg-transparent pointer-events-none py-3 text-center">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Link
              href="/desk"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md hover:bg-emerald-900 border border-emerald-700"
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>← Return to Order Desk Terminal</span>
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
