"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Clock,
  Gift,
  Percent,
  Receipt,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { SeedSku } from "@/db/seed-data";
import { CartItem, calculateCartTotals, calculateLineItem } from "@/lib/catalogue/cart-store";
import {
  getCartStorageKey,
  getMediaStorageKey,
  parseStoredCart,
  loadScopedCart,
  saveScopedCart,
  clearScopedCart,
  clearAllKiranaClientData,
  DraftCartItem,
} from "@/lib/catalogue/cart-storage";
import { useLiveStock, broadcastLocalStockChange } from "@/lib/catalogue/useLiveStock";
import BottomNav from "@/components/layout/BottomNav";
import { TRADE_DICT, getSkuDisplay, getRetailerDisplay, Language } from "@/lib/i18n/trade-dict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface RetailerLedger {
  id: string;
  name: string;
  nameHi?: string;
  ownerName: string;
  ownerNameHi?: string;
  route: string;
  routeHi?: string;
  creditLimit: number;
  currentBalance: number;
}

export default function CartPage() {
  const router = useRouter();
  const { stockMap, stockVersion, getStock, isOutOfStock } = useLiveStock();

  const { lang, setLang } = useLanguage();
  const [skus, setSkus] = useState<SeedSku[]>([]);
  const [ledger, setLedger] = useState<RetailerLedger | null>(null);
  const [cartMap, setCartMap] = useState<Record<string, DraftCartItem>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Load Catalogue, User Session & Scoped Draft Cart
  const loadCartCatalogue = React.useCallback(() => {
    fetch("/api/catalogue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const freshSkus: SeedSku[] = data.skus || [];
          setSkus(freshSkus);
          if (data.retailer) {
            setLedger({
              id: data.retailer.id,
              name: data.retailer.name,
              ownerName: data.retailer.ownerName,
              route: data.retailer.route,
              creditLimit: Number(data.retailer.creditLimit),
              currentBalance: Number(data.retailer.currentBalance),
            });

            // Cache retailer ID and re-hydrate isolated Kirana cart with fallback migration
            try {
              localStorage.setItem("isolabs_current_retailer_id", data.retailer.id);
            } catch {}
          }

          // Purge stale SKUs from cartMap that no longer exist in the active catalog
          const validIds = new Set(freshSkus.map((s) => s.id));
          setCartMap((prev) => {
            let hasStale = false;
            const clean: Record<string, DraftCartItem> = {};
            for (const [id, val] of Object.entries(prev)) {
              if (validIds.has(id)) {
                clean[id] = val;
              } else {
                hasStale = true;
              }
            }
            if (hasStale) {
              saveScopedCart(clean, data.retailer?.id);
            }
            return clean;
          });
        }
      })
      .catch((err) => console.error("Failed to load cart catalogue:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Immediate optimistic draft cart load for 0ms initial render
    const initialCart = loadScopedCart();
    setCartMap(initialCart);
    loadCartCatalogue();

    const handleReset = () => {
      setCartMap({});
      setSkus([]);
      clearAllKiranaClientData();
      loadCartCatalogue();
    };

    const handleCatalogSync = () => {
      loadCartCatalogue();
    };

    window.addEventListener("isolabs_database_reset", handleReset);
    window.addEventListener("isolabs_catalog_sync", handleCatalogSync);
    window.addEventListener("focus", loadCartCatalogue);

    return () => {
      window.removeEventListener("isolabs_database_reset", handleReset);
      window.removeEventListener("isolabs_catalog_sync", handleCatalogSync);
      window.removeEventListener("focus", loadCartCatalogue);
    };
  }, [loadCartCatalogue]);

  // Update item quantity in cart (both whole cases and loose packs)
  const updateQuantity = (skuId: string, field: "cases" | "packs", delta: number) => {
    setCartMap((prev) => {
      const current = prev[skuId] || { cases: 0, packs: 0 };
      const nextVal = Math.max(0, (current[field] || 0) + delta);
      const updatedEntry = { ...current, [field]: nextVal };
      const updated = { ...prev };
      if (updatedEntry.cases === 0 && updatedEntry.packs === 0) {
        delete updated[skuId];
      } else {
        updated[skuId] = updatedEntry;
      }
      saveScopedCart(updated, ledger?.id);
      return updated;
    });
  };

  // Remove entire line from cart
  const removeItem = (skuId: string) => {
    setCartMap((prev) => {
      const updated = { ...prev };
      delete updated[skuId];
      saveScopedCart(updated, ledger?.id);
      return updated;
    });
  };

  // Clear entire cart
  const clearCart = () => {
    setCartMap({});
    clearScopedCart(ledger?.id);
  };

  // Active Cart Items
  const activeItems: CartItem[] = useMemo(() => {
    return skus
      .filter((s) => {
        const entry = cartMap[s.id];
        return entry && (entry.cases > 0 || entry.packs > 0);
      })
      .map((s) => {
        const entry = cartMap[s.id] || { cases: 0, packs: 0 };
        return {
          ...s,
          quantityCases: entry.cases,
          quantityPacks: entry.packs,
        };
      });
  }, [skus, cartMap]);

  // Live Warehouse Inventory Validation
  const outOfStockItems = useMemo(() => {
    return activeItems.filter((it) => getStock(it.id, it.stockCases) <= 0);
  }, [activeItems, getStock]);

  const insufficientStockItems = useMemo(() => {
    return activeItems.filter((it) => {
      const live = getStock(it.id, it.stockCases);
      return live > 0 && live < it.quantityCases;
    });
  }, [activeItems, getStock]);

  // Aggregate financial calculation
  const totals = useMemo(() => {
    return calculateCartTotals(activeItems);
  }, [activeItems]);

  // Credit calculation math (Rule [A14])
  const creditLimit = ledger?.creditLimit || 50000;
  const currentBalance = ledger?.currentBalance || 0;
  const grandTotal = totals.grandTotal;
  const projectedBalance = currentBalance + grandTotal;
  const creditExceeded = projectedBalance > creditLimit;
  const exceededBy = Math.max(0, projectedBalance - creditLimit);
  const creditUsagePct = Math.min(100, Math.round((projectedBalance / creditLimit) * 100));

  // Submit order to API
  const handleCheckout = async () => {
    if (activeItems.length === 0) return;
    setErrorMessage(null);
    setLoadingCheckout(true);

    if (outOfStockItems.length > 0) {
      setErrorMessage(
        lang === "hi"
          ? `ऑर्डर नहीं किया जा सकता: ${outOfStockItems.map((o) => o.name).join(", ")} का स्टॉक समाप्त हो गया है। कृपया कार्ट से हटाएं।`
          : `Cannot place order: ${outOfStockItems.map((o) => o.name).join(", ")} is out of warehouse stock. Please remove it from your cart.`
      );
      setLoadingCheckout(false);
      return;
    }

    try {
      let mediaData: {
        mediaUrl?: string;
        mediaType?: "image" | "audio";
        orderSource?: "WHATSAPP_AI" | "PORTAL_CATALOGUE" | "SALESMAN_COUNTER";
        rawUtterance?: string;
      } = {};
      try {
        const mediaKey = getMediaStorageKey(ledger?.id);
        const rawMedia = localStorage.getItem(mediaKey) || localStorage.getItem("isolabs_order_media");
        if (rawMedia) mediaData = JSON.parse(rawMedia);
      } catch {}

      const payload = {
        retailerId: ledger?.id,
        items: activeItems.map((it) => ({
          skuId: it.id,
          quantityCases: it.quantityCases,
          quantityPacks: it.quantityPacks || 0,
        })),
        mediaUrl: mediaData.mediaUrl,
        mediaType: mediaData.mediaType,
        orderSource: mediaData.orderSource || "PORTAL_CATALOGUE",
        notes: mediaData.rawUtterance,
      };

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Order placement failed. Please verify stock.");
        setLoadingCheckout(false);
        return;
      }

      // Broadcast stock update locally for instant cross-tab sync
      if (data.updatedSkus && Array.isArray(data.updatedSkus)) {
        broadcastLocalStockChange(data.updatedSkus);
      }

      // Clear local storage cart and media draft upon successful placement
      clearScopedCart(ledger?.id);
      try {
        const mediaKey = getMediaStorageKey(ledger?.id);
        localStorage.removeItem(mediaKey);
        localStorage.removeItem("isolabs_order_media");
      } catch {}
      setCartMap({});

      router.push(`/orders?placed=${data.orderId}`);
    } catch {
      setErrorMessage("Network error during checkout. Please try again.");
      setLoadingCheckout(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  const t = TRADE_DICT[lang];
  const ledgerDisplay = ledger ? getRetailerDisplay(ledger, lang) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans antialiased">
      <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl min-h-screen bg-white flex flex-col md:shadow-xl md:border-x md:border-slate-200/80 pb-28 relative">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/catalogue"
              className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {lang === "hi" ? "ऑर्डर सारांश / कार्ट" : "Review Wholesale Order"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-500 font-medium truncate">
                  {ledgerDisplay ? `${ledgerDisplay.name} • ${ledgerDisplay.route}` : (lang === "hi" ? "शर्मा किराना स्टोर • नेपियर टाउन" : "Sharma Kirana • Napier Town")}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Sync v{stockVersion}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Hindi / English Toggle & Logout */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="h-8 px-2.5 text-xs font-bold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-1 transition-colors"
            >
              <span className={lang === "hi" ? "text-emerald-700" : "text-slate-400"}>
                अ/A
              </span>
              <span>{lang === "en" ? "हिंदी" : "English"}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-8 h-8 rounded-md border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md md:max-w-5xl lg:max-w-6xl w-full mx-auto px-4 pt-4 space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">{lang === "hi" ? "चेकआउट समस्या" : "Checkout Issue"}</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Real-time Out-of-Stock Live Alert Banner */}
        {outOfStockItems.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-red-900 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-red-700">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>
                {lang === "hi"
                  ? "⚠️ स्टॉक चेतावनी: कार्ट का सामान गोदाम में समाप्त हो गया है!"
                  : "⚠️ Live Stock Alert: Warehouse Inventory Ran Out!"}
              </span>
            </div>
            <p className="text-xs text-red-800 leading-relaxed">
              {lang === "hi"
                ? `अन्य दुकानदार ने आपसे पहले ऑर्डर कर दिया: ${outOfStockItems.map((o) => getSkuDisplay(o, lang).name).join(", ")} अब गोदाम में उपलब्ध नहीं है। आर्डर पूरा करने के लिए कृपया नीचे दिए बटन से इसे कार्ट से हटाएं।`
                : `Another retailer just placed an order for the remaining cases of: ${outOfStockItems.map((o) => o.name).join(", ")}. Please remove them to proceed with checkout.`}
            </p>
            <button
              type="button"
              onClick={() => {
                outOfStockItems.forEach((o) => removeItem(o.id));
              }}
              className="self-start text-xs font-bold text-white bg-red-700 hover:bg-red-800 px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {lang === "hi" ? "आउट-ऑफ-स्टॉक सामान तुरंत हटाएं" : "Remove Out-of-Stock Items"}
            </button>
          </div>
        )}

        {/* Empty State */}
        {activeItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-sm my-8 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.cartIsEmptyTitle}
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                {t.cartIsEmptySubtitle}
              </p>
            </div>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs hover:bg-emerald-800 transition-colors"
            >
              <span>{t.browseCatalogueBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (Items Breakdown) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Itemized Case Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {lang === "hi" ? "कार्ट में उत्पाद" : "Order Line Items"} ({activeItems.length})
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      {totals.totalCases} {lang === "hi" ? "पेटी" : "Cases"} {totals.totalPacks > 0 && `+ ${totals.totalPacks} ${lang === "hi" ? "पैकेट" : "Packs"}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer transition-colors"
                  >
                    {t.emptyCartBtn}
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {activeItems.map((sku) => {
                    const calc = calculateLineItem(sku);
                    const liveStock = getStock(sku.id, sku.stockCases);
                    const isZeroStock = liveStock <= 0;
                    const isOverStock = liveStock > 0 && liveStock < sku.quantityCases;
                    const skuDisplay = getSkuDisplay(sku, lang);

                    return (
                      <div
                        key={sku.id}
                        className={`py-3.5 first:pt-1 last:pb-1 flex flex-col gap-2.5 rounded-lg p-2.5 transition-colors ${
                          isZeroStock ? "bg-red-50/70 border border-red-200" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {skuDisplay.brand} • {sku.code}
                              </span>
                              {isZeroStock && (
                                <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  {lang === "hi" ? "स्टॉक समाप्त (0 पेटी)" : "OUT OF STOCK"}
                                </span>
                              )}
                              {isOverStock && (
                                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  {t.casesLeft(liveStock)}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                              {skuDisplay.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              ₹{sku.dealerPrice.toFixed(2)}{t.perCase} · ₹{sku.packPrice.toFixed(2)}{t.perPack} · {sku.unitsPerCase} {t.packsPerCase}
                            </p>
                          </div>

                          {/* Line Total */}
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold font-mono text-slate-900 block">
                              ₹{Math.round(calc.totalAmount).toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {sku.gstRate}% {t.inclGst}
                            </span>
                          </div>
                        </div>

                        {/* Active Scheme Badges */}
                        {calc.freeCases > 0 && (
                          <div className="bg-emerald-50 text-emerald-900 text-xs px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5 font-medium leading-relaxed">
                            <Gift className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>
                              {lang === "hi"
                                ? `🎉 योजना अनलॉक: +${calc.freeCases} पेटी मुफ्त (कुल ${calc.quantityCases + calc.freeCases} पेटी डिलीवर होंगी)`
                                : `🎉 Scheme Unlocked: +${calc.freeCases} Free Case (Total ${calc.quantityCases + calc.freeCases} cases delivered at ₹0.00)`}
                            </span>
                          </div>
                        )}

                        {calc.discountAmount > 0 && (
                          <div className="bg-blue-50 text-blue-900 text-xs px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1.5 font-medium leading-relaxed">
                            <Percent className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>
                              {lang === "hi"
                                ? `🏷️ ${sku.schemeDetail?.discountPct || 3}% स्लैब छूट लागू (-₹${calc.discountAmount.toFixed(2)} बचत)`
                                : `🏷️ ${sku.schemeDetail?.discountPct || 3}% Slab Discount Applied (-₹${calc.discountAmount.toFixed(2)} savings)`}
                            </span>
                          </div>
                        )}

                        {/* Quantity Stepper Row for Cases & Loose Packs */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-50">
                          <div className="flex items-center gap-3">
                            {/* Case Stepper */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                              <span className="text-[11px] font-bold text-slate-600 px-1">{t.caseLabel}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(sku.id, "cases", -1)}
                                disabled={calc.quantityCases <= 0}
                                className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                                {calc.quantityCases}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(sku.id, "cases", 1)}
                                disabled={calc.quantityCases >= sku.stockCases}
                                className="w-7 h-7 flex items-center justify-center bg-emerald-700 text-white hover:bg-emerald-800 rounded cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Loose Pack Stepper */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                              <span className="text-[11px] font-bold text-slate-600 px-1">{t.packLabel}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(sku.id, "packs", -1)}
                                disabled={calc.quantityPacks <= 0}
                                className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                                {calc.quantityPacks}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(sku.id, "packs", 1)}
                                className="w-7 h-7 flex items-center justify-center bg-slate-800 text-white hover:bg-slate-900 rounded cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(sku.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column (Credit Ledger + Tax Invoice Summary + Checkout Action) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
              {/* 1. B2B Credit Headroom Meter */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {creditExceeded ? (
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    )}
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {lang === "hi" ? "क्रेडिट हेडरुम मीटर" : "Credit Ledger Headroom"}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    ₹{creditLimit.toLocaleString("en-IN")} {lang === "hi" ? "सीमा" : "Limit"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>
                      {lang === "hi" ? "वर्तमान बकाया: " : "Existing: "}
                      ₹{currentBalance.toLocaleString("en-IN")}
                    </span>
                    <span>
                      + {lang === "hi" ? "यह ऑर्डर: " : "This Order: "}
                      ₹{grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        creditExceeded ? "bg-amber-500" : "bg-emerald-600"
                      }`}
                      style={{ width: `${creditUsagePct}%` }}
                    />
                  </div>
                </div>

                {/* Status Note */}
                <div className="mt-2.5 text-xs">
                  {creditExceeded ? (
                    <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded p-2 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">
                          {lang === "hi"
                            ? `क्रेडिट सीमा ₹${exceededBy.toLocaleString("en-IN")} से अधिक हो रही है: `
                            : `Credit limit exceeded by ₹${exceededBy.toLocaleString("en-IN")}: `}
                        </span>
                        {lang === "hi"
                          ? "ऑर्डर स्वीकार हो जाएगा लेकिन डिस्पैच से पहले डेस्क क्लर्क की मंजूरी आवश्यक होगी।"
                          : "Order will be placed under CREDIT_HOLD status for clerk review before dispatch."}
                      </div>
                    </div>
                  ) : (
                    <div className="text-emerald-800 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>
                        {lang === "hi"
                          ? `उपलब्ध शेष क्रेडिट: ₹${(creditLimit - projectedBalance).toLocaleString("en-IN")}`
                          : `Available headroom after this order: ₹${(creditLimit - projectedBalance).toLocaleString("en-IN")}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Commercial Tax Invoice Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Receipt className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {lang === "hi" ? "कर बीजक सारांश (जीएसटी)" : "Tax Invoice Summary"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{t.orderedCases}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {totals.totalCases} {lang === "hi" ? "पेटी" : "cases"}
                    </span>
                  </div>

                  {totals.totalPacks > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>{t.orderedPacks}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {totals.totalPacks} {lang === "hi" ? "पैकेट" : "packs"}
                      </span>
                    </div>
                  )}

                  {totals.totalFreeCases > 0 && (
                    <div className="flex justify-between text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded">
                      <span>{t.freePromotional}</span>
                      <span className="font-mono">+{totals.totalFreeCases} {lang === "hi" ? "पेटी मुफ्त" : "cases free"}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>{t.grossSubtotal}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{totals.grossSubtotal.toFixed(2)}
                    </span>
                  </div>

                  {totals.totalDiscounts > 0 && (
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>{t.totalDiscounts}</span>
                      <span className="font-mono">-₹{totals.totalDiscounts.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>{t.taxableSubtotal}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{totals.taxableSubtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>{t.cgst}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(totals.totalGst / 2).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>{t.sgst}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(totals.totalGst / 2).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        {t.grandTotalPayable}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {lang === "hi" ? "राउंड ऑफ सहित" : "Net rounded invoice amount"}
                      </span>
                    </div>
                    <span className="text-xl font-bold font-mono text-emerald-800">
                      ₹{totals.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Dispatch Cutoff Alert */}
              <div className="bg-slate-200/60 border border-slate-300 rounded-lg p-3 flex items-start gap-2.5 text-xs text-slate-700">
                <Clock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {lang === "hi" ? "2:00 PM कटऑफ समय: " : "2:00 PM Dispatch Cutoff: "}
                  </span>
                  {lang === "hi"
                    ? "दोपहर 2:00 बजे से पहले दिए गए ऑर्डर आपकी डिलीवरी वैन द्वारा कल सुबह 9:30 बजे तक पहुंचा दिए जाएंगे।"
                    : "Orders confirmed before 2:00 PM are batched for delivery van loading tomorrow morning by 9:30 AM."}
                </div>
              </div>

              {/* 5. Primary Checkout Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loadingCheckout || outOfStockItems.length > 0}
                  className={`w-full min-h-[48px] h-auto py-3 px-3 font-bold text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-center ${
                    outOfStockItems.length > 0
                      ? "bg-red-700 text-white opacity-85 cursor-not-allowed"
                      : "bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white disabled:opacity-70 disabled:cursor-not-allowed"
                  }`}
                >
                  {loadingCheckout ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{t.submittingOrder}</span>
                    </>
                  ) : outOfStockItems.length > 0 ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                      <span>
                        {lang === "hi"
                          ? "आउट ऑफ स्टॉक सामान हटाएं"
                          : "Remove Out of Stock Items to Order"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="break-words">
                        {creditExceeded
                          ? (lang === "hi"
                            ? "ऑर्डर भेजें (डेस्क समीक्षा हेतु)"
                            : "Place Order (Flag Credit Hold)")
                          : (lang === "hi"
                          ? `ऑर्डर पक्का करें • ₹${totals.grandTotal.toLocaleString("en-IN")}`
                          : `Confirm & Place Order • ₹${totals.grandTotal.toLocaleString("en-IN")}`)}
                      </span>
                      <ArrowRight className="w-5 h-5 shrink-0" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav cartItemCount={totals.itemCount} lang={lang} />
      </div>
    </div>
  );
}
