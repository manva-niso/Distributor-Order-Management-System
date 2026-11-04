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
  Sparkles,
  Receipt,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { SeedSku } from "@/db/seed-data";
import { CartItem, calculateCartTotals, calculateLineItem } from "@/lib/catalogue/cart-store";
import BottomNav from "@/components/layout/BottomNav";

type Language = "en" | "hi";

interface RetailerLedger {
  id: string;
  name: string;
  ownerName: string;
  route: string;
  creditLimit: number;
  currentBalance: number;
}

interface DraftCartItem {
  cases: number;
  packs: number;
}

function parseStoredCart(raw: string | null): Record<string, DraftCartItem> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const result: Record<string, DraftCartItem> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "number") {
        result[key] = { cases: val, packs: 0 };
      } else if (val && typeof val === "object") {
        const v = val as { cases?: number; packs?: number };
        result[key] = { cases: v.cases || 0, packs: v.packs || 0 };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export default function CartPage() {
  const router = useRouter();

  const [lang, setLang] = useState<Language>("en");
  const [skus, setSkus] = useState<SeedSku[]>([]);
  const [ledger, setLedger] = useState<RetailerLedger | null>(null);
  const [cartMap, setCartMap] = useState<Record<string, DraftCartItem>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Load Catalogue, User Session & Draft Cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("isolabs_draft_cart");
      if (savedCart) {
        setCartMap(parseStoredCart(savedCart));
      }
    } catch {}

    fetch("/api/catalogue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSkus(data.skus || []);
          if (data.retailer) {
            setLedger({
              id: data.retailer.id,
              name: data.retailer.name,
              ownerName: data.retailer.ownerName,
              route: data.retailer.route,
              creditLimit: Number(data.retailer.creditLimit),
              currentBalance: Number(data.retailer.currentBalance),
            });
          }
        }
      })
      .catch((err) => console.error("Failed to load cart catalogue:", err))
      .finally(() => setLoading(false));
  }, []);

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
      try {
        localStorage.setItem("isolabs_draft_cart", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Remove entire line from cart
  const removeItem = (skuId: string) => {
    setCartMap((prev) => {
      const updated = { ...prev };
      delete updated[skuId];
      try {
        localStorage.setItem("isolabs_draft_cart", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Clear entire cart
  const clearCart = () => {
    setCartMap({});
    try {
      localStorage.removeItem("isolabs_draft_cart");
    } catch {}
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

    try {
      let mediaData: {
        mediaUrl?: string;
        mediaType?: "image" | "audio";
        orderSource?: "WHATSAPP_AI" | "PORTAL_CATALOGUE" | "SALESMAN_COUNTER";
        rawUtterance?: string;
      } = {};
      try {
        const rawMedia = localStorage.getItem("isolabs_order_media");
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

      // Clear local storage cart and media draft upon successful placement
      try {
        localStorage.removeItem("isolabs_draft_cart");
        localStorage.removeItem("isolabs_order_media");
      } catch {}
      setCartMap({});

      router.push(`/orders?placed=${data.orderId}`);
    } catch {
      setErrorMessage("Network error during checkout. Please try again.");
      setLoadingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
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
              <p className="text-xs text-slate-500 font-medium">
                {ledger?.name || "Kirana Account"} • {ledger?.route || "Jabalpur"}
              </p>
            </div>
          </div>

          {/* Hindi / English Toggle */}
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Checkout Issue</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-sm my-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === "hi" ? "आपकी कार्ट खाली है" : "Your order cart is empty"}
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                {lang === "hi"
                  ? "डिलीवरी वैन के लिए सामान जोड़ने हेतु हमारे थोक कैटलॉग पर जाएं।"
                  : "Add master cases from our wholesale FMCG catalogue to prepare your van delivery order."}
              </p>
            </div>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs hover:bg-emerald-800 transition-colors"
            >
              <span>{lang === "hi" ? "कैटलॉग देखें" : "Browse Wholesale Catalogue"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* 1. B2B Credit Headroom Meter (Rule [A14]) */}
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
                  ₹{creditLimit.toLocaleString("en-IN")} Limit
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

            {/* 2. Itemized Case Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {lang === "hi" ? "कार्ट में उत्पाद" : "Order Line Items"} ({activeItems.length})
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    {totals.totalCases} Cases {totals.totalPacks > 0 && `+ ${totals.totalPacks} Packs`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer transition-colors"
                >
                  {lang === "hi" ? "कार्ट खाली करें" : "Empty Cart"}
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {activeItems.map((sku) => {
                  const calc = calculateLineItem(sku);

                  return (
                    <div key={sku.id} className="py-3.5 first:pt-1 last:pb-1 flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {sku.brand} • {sku.code}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                            {sku.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            ₹{sku.dealerPrice.toFixed(2)}/case · ₹{sku.packPrice.toFixed(2)}/pack · {sku.unitsPerCase} packs/case
                          </p>
                        </div>

                        {/* Line Total */}
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold font-mono text-slate-900 block">
                            ₹{Math.round(calc.totalAmount).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Incl. {sku.gstRate}% GST
                          </span>
                        </div>
                      </div>

                      {/* Active Scheme Badges */}
                      {calc.freeCases > 0 && (
                        <div className="bg-emerald-50 text-emerald-900 text-xs px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          <span>
                            {lang === "hi"
                              ? `🎉 योजना अनलॉक: +${calc.freeCases} पेटी मुफ्त (कुल ${calc.quantityCases + calc.freeCases} पेटी डिलीवर होंगी)`
                              : `🎉 Scheme Unlocked: +${calc.freeCases} Free Case (Total ${calc.quantityCases + calc.freeCases} cases delivered at ₹0.00)`}
                          </span>
                        </div>
                      )}

                      {calc.discountAmount > 0 && (
                        <div className="bg-blue-50 text-blue-900 text-xs px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1.5 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                          <span>
                            {lang === "hi"
                              ? `🏷️ 3% स्लैब छूट लागू (-₹${calc.discountAmount.toFixed(2)})`
                              : `🏷️ Flat 3% Slab Discount Applied (-₹${calc.discountAmount.toFixed(2)} savings)`}
                          </span>
                        </div>
                      )}

                      {/* Quantity Stepper Row for Cases & Loose Packs */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          {/* Case Stepper */}
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                            <span className="text-[11px] font-bold text-slate-600 px-1">Case:</span>
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
                            <span className="text-[11px] font-bold text-slate-600 px-1">Pack:</span>
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
                  <span>{lang === "hi" ? "ऑर्डर की गई पेटी: " : "Ordered Master Cases:"}</span>
                  <span className="font-mono font-bold text-slate-900">{totals.totalCases} cases</span>
                </div>

                {totals.totalPacks > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{lang === "hi" ? "ऑर्डर किए गए खुले पैकेट: " : "Ordered Loose Packs:"}</span>
                    <span className="font-mono font-bold text-slate-900">{totals.totalPacks} packs</span>
                  </div>
                )}

                {totals.totalFreeCases > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded">
                    <span>{lang === "hi" ? "मुफ्त योजना पेटी (₹0): " : "Promotional Free Cases (₹0):"}</span>
                    <span className="font-mono">+{totals.totalFreeCases} cases free</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>{lang === "hi" ? "सकल राशि (बिना टैक्स): " : "Gross Subtotal (Ex-GST):"}</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{totals.grossSubtotal.toFixed(2)}
                  </span>
                </div>

                {totals.totalDiscounts > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>{lang === "hi" ? "कुल योजना छूट: " : "Total Trade Discounts:"}</span>
                    <span className="font-mono">-₹{totals.totalDiscounts.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>{lang === "hi" ? "कर योग्य मूल्य: " : "Taxable Value:"}</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{totals.taxableSubtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>CGST (9.0% / 2.5%):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{(totals.totalGst / 2).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>SGST (9.0% / 2.5%):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{(totals.totalGst / 2).toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {lang === "hi" ? "कुल देय राशि (जीएसटी सहित):" : "Grand Total Payable (Incl. GST):"}
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

            {/* 4. Dispatch Cutoff Alert (Rule [A1]) */}
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

            {/* 5. Primary Checkout Action Button (48px Touch Target) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={loadingCheckout}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingCheckout ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{lang === "hi" ? "ऑर्डर दर्ज किया जा रहा है..." : "Submitting Order to Desk..."}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {creditExceeded
                        ? lang === "hi"
                          ? "ऑर्डर भेजें (डेस्क समीक्षा हेतु)"
                          : "Place Order (Flag Credit Hold)"
                        : lang === "hi"
                        ? `ऑर्डर पक्का करें • ₹${totals.grandTotal.toLocaleString("en-IN")}`
                        : `Confirm & Place Order • ₹${totals.grandTotal.toLocaleString("en-IN")}`}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav cartItemCount={totals.itemCount} lang={lang} />
    </div>
  );
}
