"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  FileText,
  Sparkles,
  Truck,
  Building2,
  Phone,
  Wallet,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { calculateOrderSummary, InputLineItem } from "@/lib/schemes/engine";
import { SeedSku } from "@/db/seed-data";

interface EditableLine {
  id: string;
  skuId: string;
  quantityCases: number;
  originalPhrase?: string;
  isModified?: boolean;
}

interface OrderDetail {
  id: string;
  retailerId: string;
  retailerName: string;
  route?: string;
  placedBy: string;
  orderSource?: string;
  rawUtterance?: string;
  mediaUrl?: string;
  mediaType?: string;
  status: "PLACED" | "VERIFIED" | "CREDIT_HOLD" | "EXPORTED_TALLY" | "CANCELLED";
  subtotal: number;
  schemeDiscount: number;
  taxableAmount: number;
  totalGst: number;
  grandTotal: number;
  occVersion: number;
  creditHoldReason?: string;
  createdAt: string;
}

interface RetailerDetail {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  route: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  creditHold: boolean;
}

export default function DeskOrderVerificationPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [retailer, setRetailer] = useState<RetailerDetail | null>(null);
  const [catalogueSkus, setCatalogueSkus] = useState<SeedSku[]>([]);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [learnedPhrases, setLearnedPhrases] = useState<Array<{ rawPhrase: string; skuId: string }>>([]);

  // Load Order Data
  const loadOrder = async () => {
    setLoading(true);
    setErrorMsg(null);
    setConflictError(null);

    try {
      const res = await fetch(`/api/desk/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to load order record.");
        return;
      }

      setOrder(data.order);
      setRetailer(data.retailer);
      setCatalogueSkus(data.catalogueSkus || []);

      // Map existing lines
      const initialLines: EditableLine[] = (data.items || []).map((it: any) => ({
        id: it.id,
        skuId: it.skuId,
        quantityCases: it.quantityCases,
      }));
      setLines(initialLines);
    } catch {
      setErrorMsg("Network error loading order record.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  // Fast SKU Lookup Map
  const skuMap = useMemo(() => {
    const map = new Map<string, SeedSku>();
    for (const sku of catalogueSkus) {
      map.set(sku.id, sku);
    }
    return map;
  }, [catalogueSkus]);

  // Live Scheme & Financial Recalculation
  const liveCalculation = useMemo(() => {
    if (lines.length === 0) return null;

    const engineInputs: InputLineItem[] = [];
    for (const line of lines) {
      const sku = skuMap.get(line.skuId);
      if (sku) {
        engineInputs.push({
          skuId: sku.id,
          skuCode: sku.code,
          skuName: sku.name,
          orderedCases: line.quantityCases,
          dealerPrice: sku.dealerPrice,
          gstRate: sku.gstRate,
          schemeType: sku.schemeType,
          schemeDetail: sku.schemeDetail,
        });
      }
    }

    if (engineInputs.length === 0) return null;
    return calculateOrderSummary(engineInputs);
  }, [lines, skuMap]);

  // Adjust Line Quantity
  const handleUpdateQty = (lineId: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const next = Math.max(1, l.quantityCases + delta);
        return { ...l, quantityCases: next, isModified: true };
      })
    );
  };

  // Change Matched SKU (Triggers Alias Auto-Learning Rule [A20])
  const handleChangeSku = (lineId: string, newSkuId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return { ...l, skuId: newSkuId, isModified: true };
      })
    );

    // Track for auto-learning if there's raw utterance context
    if (order?.rawUtterance) {
      setLearnedPhrases((prev) => [
        ...prev,
        { rawPhrase: `corrected_line_${lineId}`, skuId: newSkuId },
      ]);
    }
  };

  // Remove Line Item
  const handleRemoveLine = (lineId: string) => {
    if (lines.length === 1) {
      alert("Order must contain at least one line item.");
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Add Line Item
  const handleAddLine = () => {
    if (catalogueSkus.length === 0) return;
    const defaultSku = catalogueSkus[0];
    const newLine: EditableLine = {
      id: `line_new_${Date.now()}`,
      skuId: defaultSku.id,
      quantityCases: 1,
      isModified: true,
    };
    setLines((prev) => [...prev, newLine]);
  };

  // Submit Order Updates (with OCC version checking Rule [A19])
  const handleSubmit = async (action: "CONFIRM" | "SAVE_CHANGES" | "REJECT") => {
    if (!order) return;
    setSaving(true);
    setConflictError(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/desk/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expectedOccVersion: order.occVersion,
          items: lines.map((l) => ({
            skuId: l.skuId,
            quantityCases: l.quantityCases,
          })),
          newAliases: learnedPhrases,
        }),
      });

      const data = await res.json();

      if (res.status === 409 || data.conflict) {
        // Concurrency Conflict Detected!
        setConflictError(
          data.error ||
            "OCC Conflict: Another clerk updated this order simultaneously. Please reload to see the latest version."
        );
        return;
      }

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to update order.");
        return;
      }

      setSuccessToast(
        action === "CONFIRM"
          ? "Order successfully verified & confirmed for Tally export!"
          : action === "REJECT"
          ? "Order has been cancelled."
          : "Order changes saved successfully."
      );

      // Refresh local order state
      setOrder(data.order);
      setLearnedPhrases([]);

      setTimeout(() => {
        router.push("/desk");
      }, 1200);
    } catch {
      setErrorMsg("Network error saving order updates.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 mx-auto mb-2" />
          Loading order verification workspace...
        </div>
      </div>
    );
  }

  if (!order || !retailer) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Order Not Found</h2>
          <p className="text-xs text-slate-500">
            {errorMsg || "The requested order record does not exist."}
          </p>
          <Link
            href="/desk"
            className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
          >
            Return to Orders Queue
          </Link>
        </div>
      </div>
    );
  }

  const isCreditHold = order.status === "CREDIT_HOLD";
  const projectedBalance =
    (retailer.currentBalance || 0) + (liveCalculation?.grandTotal || order.grandTotal);
  const exceedsCredit = projectedBalance > retailer.creditLimit;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/desk"
              className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-none">
                  Verify Order #{order.id}
                </h1>
                <span className="font-mono text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  OCC v{order.occVersion}
                </span>
                {order.status === "PLACED" && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Needs Review
                  </span>
                )}
                {order.status === "CREDIT_HOLD" && (
                  <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                    Credit Hold
                  </span>
                )}
                {order.status === "VERIFIED" && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Confirmed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {retailer.name} • {retailer.route}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadOrder}
              className="h-8 px-2.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
              title="Reload fresh data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. ALERTS BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-3">
        {conflictError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-xs text-red-900 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-red-950">
                  Concurrency Collision (OCC Rule [A19])
                </strong>
                <p className="mt-0.5 text-red-800">{conflictError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadOrder}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
            >
              Reload Latest
            </button>
          </div>
        )}

        {successToast && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{successToast}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 3. SPLIT-SCREEN WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Source Utterance & Retailer Ledger (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Raw Message Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Original Received Text:</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                  {order.orderSource || "WHATSAPP_AI"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                {order.rawUtterance || "Order booked directly through retailer portal catalogue."}
              </div>

              {order.mediaUrl && (
                <div className="mt-2.5 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      {order.mediaType === "audio" ? "🎙️ Attached Hindi Voice Note" : "📸 Attached Kirana Paper Slip"}
                    </span>
                    <a
                      href={order.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1"
                    >
                      <span>Open Full Media</span>
                      <span>↗</span>
                    </a>
                  </div>

                  {order.mediaType === "audio" ? (
                    <audio controls src={order.mediaUrl} className="w-full h-8" />
                  ) : (
                    <div className="rounded-md overflow-hidden border border-indigo-200 max-h-48 bg-white flex items-center justify-center">
                      <img
                        src={order.mediaUrl}
                        alt="Handwritten order slip"
                        className="w-full h-auto object-contain max-h-48"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span>By: {order.placedBy}</span>
              </div>
            </div>

            {/* Retailer Profile & Credit Headroom Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {retailer.name}
                  </h3>
                  <span className="text-xs text-slate-500">Prop: {retailer.ownerName}</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                  {retailer.id}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium">{retailer.route}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>+91 {retailer.phone}</span>
                </div>
              </div>

              {/* Credit Headroom Meter */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Credit Limit:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{retailer.creditLimit.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Outstanding:</span>
                  <span className="font-mono text-slate-700">
                    ₹{retailer.currentBalance.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-1.5">
                  <span className="font-bold text-slate-800">Projected Exposure:</span>
                  <span
                    className={`font-mono font-bold ${
                      exceedsCredit ? "text-red-700" : "text-emerald-800"
                    }`}
                  >
                    ₹{Math.round(projectedBalance).toLocaleString("en-IN")}
                  </span>
                </div>

                {exceedsCredit && (
                  <div className="bg-red-100/70 text-red-900 p-2 rounded text-[11px] font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-700 shrink-0" />
                    <span>
                      Exceeds limit by ₹
                      {Math.round(projectedBalance - retailer.creditLimit).toLocaleString("en-IN")}. Requires clerk release.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Alias Auto-Learning Notice (Rule [A20]) */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-xs text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Retailer Vocabulary Auto-Learning (Rule [A20])</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                When you correct or adjust SKU lines on the right, the mapping is saved for{" "}
                <strong>{retailer.name}</strong>. Future WhatsApp orders with those terms will match with 100% confidence.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Editable Line Items & Live Recalculation (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Structured Order Lines ({lines.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              {/* Line Items List */}
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const sku = skuMap.get(line.skuId);
                  const calcLine = liveCalculation?.lines.find((l) => l.skuId === line.skuId);

                  return (
                    <div
                      key={line.id}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* SKU Selector */}
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Line #{idx + 1} • Select Master SKU:
                          </label>
                          <select
                            value={line.skuId}
                            onChange={(e) => handleChangeSku(line.id, e.target.value)}
                            className="w-full text-xs font-bold bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                          >
                            {catalogueSkus.map((s) => (
                              <option key={s.id} value={s.id}>
                                [{s.brand}] {s.name} — ₹{s.dealerPrice.toFixed(2)}/cs
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="shrink-0 text-right">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Cases:
                          </label>
                          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(line.id, -1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-9 text-center font-bold text-xs font-mono text-slate-900">
                              {line.quantityCases}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(line.id, 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Delete Line */}
                        <div className="pt-5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Schemes & Subtotal Row */}
                      {sku && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            {calcLine?.freeCases ? (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                +{calcLine.freeCases} Free Case (Promotional)
                              </span>
                            ) : null}
                            {calcLine?.discountAmount ? (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                Slab Discount (-₹{calcLine.discountAmount.toFixed(2)})
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-400">
                              {sku.unitsPerCase} packs/cs • ₹{sku.packPrice.toFixed(2)}/pack
                            </span>
                          </div>

                          <div className="font-mono font-bold text-slate-900 text-right">
                            ₹
                            {Math.round(
                              calcLine
                                ? calcLine.taxableAmount + calcLine.totalGstAmount
                                : line.quantityCases * sku.dealerPrice * 1.18
                            ).toLocaleString("en-IN")}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Invoice Summary Box */}
              {liveCalculation && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal Ex-GST ({liveCalculation.totalOrderedCases} cases):</span>
                    <span className="font-mono">
                      ₹{liveCalculation.totalGrossAmount.toFixed(2)}
                    </span>
                  </div>

                  {liveCalculation.totalDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-amber-800 font-medium">
                      <span>Trade Scheme Savings:</span>
                      <span className="font-mono">
                        -₹{liveCalculation.totalDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span className="font-mono">
                      ₹{liveCalculation.totalTaxableAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Intra-State GST (CGST 50% + SGST 50%):</span>
                    <span className="font-mono">
                      +₹{liveCalculation.totalGstAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Commercial Invoice Total:</span>
                    <span className="font-mono text-base text-emerald-800">
                      ₹{liveCalculation.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. ACTIONS TOOLBAR */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleSubmit("REJECT")}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel / Reject Order
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSubmit("SAVE_CHANGES")}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit("CONFIRM")}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Confirm Order (VERIFIED)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
