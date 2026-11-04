"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { SeedSku } from "@/db/seed-data";
import { ParsedLineItem } from "@/lib/ai/types";
import BottomNav from "@/components/layout/BottomNav";

type Language = "en" | "hi";

export default function QuickOrderPage() {
  const router = useRouter();

  const [lang, setLang] = useState<Language>("en");
  const [inputText, setInputText] = useState(
    "bhaiya 5 peti biscuit chhota\n2 peti ghadi powder 1 kg\n1 peti chai wagh bakri 250"
  );
  const [allSkus, setAllSkus] = useState<SeedSku[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsedLines, setParsedLines] = useState<ParsedLineItem[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/catalogue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.skus) {
          setAllSkus(data.skus);
        }
      })
      .catch(() => {});
  }, []);

  // Quick Demo Templates
  const loadTemplate = (text: string) => {
    setInputText(text);
    setParsedLines(null);
    setErrorMsg(null);
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;

    setParsing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/capture/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to parse text. Please check format.");
        setParsing(false);
        return;
      }

      setParsedLines(data.lines || []);
    } catch {
      setErrorMsg("Network error parsing order text.");
    } finally {
      setParsing(false);
    }
  };

  // Resolve Unit Ambiguity (Rule [A16]: Choose Case vs Loose Pack)
  const resolveUnit = (lineId: string, chosenUnit: "CASE" | "PACK") => {
    if (!parsedLines) return;
    setParsedLines((prev) =>
      prev!.map((line) => {
        if (line.id !== lineId) return line;

        const qty = line.extractedQty || 1;
        return {
          ...line,
          extractedUnit: chosenUnit,
          isAmbiguous: false,
          ambiguityReason: null,
          resolvedQtyCases: chosenUnit === "CASE" ? qty : 0,
          resolvedQtyPacks: chosenUnit === "PACK" ? qty : 0,
          confidence: 0.95,
        };
      })
    );
  };

  // Resolve Broken Master Case (Rule [A36]: Round Up to Full Case vs Request Cut Pack)
  const resolveBrokenCase = (lineId: string, action: "ROUND_UP" | "KEEP_LOOSE") => {
    if (!parsedLines) return;
    setParsedLines((prev) =>
      prev!.map((line) => {
        if (line.id !== lineId) return line;

        const roundUpCases = line.brokenCaseInfo?.fullCaseRoundUp || 1;
        const requestedPacks = line.brokenCaseInfo?.requestedPacks || line.extractedQty || 1;

        return {
          ...line,
          extractedUnit: action === "ROUND_UP" ? "CASE" : "PACK",
          isAmbiguous: false,
          ambiguityReason: null,
          resolvedQtyCases: action === "ROUND_UP" ? roundUpCases : 0,
          resolvedQtyPacks: action === "KEEP_LOOSE" ? requestedPacks : 0,
          confidence: 0.98,
        };
      })
    );
  };

  // Adjust resolved quantity
  const updateLineQty = (lineId: string, delta: number) => {
    if (!parsedLines) return;
    setParsedLines((prev) =>
      prev!.map((line) => {
        if (line.id !== lineId) return line;
        if (line.resolvedQtyPacks && line.resolvedQtyPacks > 0) {
          const next = Math.max(1, line.resolvedQtyPacks + delta);
          return { ...line, resolvedQtyPacks: next };
        }
        const next = Math.max(1, line.resolvedQtyCases + delta);
        return { ...line, resolvedQtyCases: next };
      })
    );
  };

  // Manually assign SKU for unrecognized lines
  const manuallyAssignSku = (lineId: string, sku: SeedSku) => {
    if (!parsedLines) return;
    setParsedLines((prev) =>
      prev!.map((line) => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          matchedSku: sku,
          isAmbiguous: false,
          ambiguityReason: null,
          confidence: 0.99,
        };
      })
    );
  };

  // Remove line from parsed list
  const removeLine = (lineId: string) => {
    if (!parsedLines) return;
    setParsedLines((prev) => prev!.filter((l) => l.id !== lineId));
  };

  // Commit all confirmed lines to localStorage Cart and navigate to /cart
  const handleMoveToCart = () => {
    if (!parsedLines || parsedLines.length === 0) return;

    try {
      const existing = localStorage.getItem("isolabs_draft_cart");
      let cartMap: Record<string, { cases: number; packs: number }> = {};
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "number") {
              cartMap[k] = { cases: v, packs: 0 };
            } else if (v && typeof v === "object") {
              const obj = v as { cases?: number; packs?: number };
              cartMap[k] = { cases: obj.cases || 0, packs: obj.packs || 0 };
            }
          }
        } catch {}
      }

      for (const line of parsedLines) {
        if (line.matchedSku) {
          const entry = cartMap[line.matchedSku.id] || { cases: 0, packs: 0 };
          const addCases = line.resolvedQtyCases || 0;
          const addPacks = line.resolvedQtyPacks || 0;
          cartMap[line.matchedSku.id] = {
            cases: entry.cases + addCases,
            packs: entry.packs + addPacks,
          };
        }
      }

      localStorage.setItem("isolabs_draft_cart", JSON.stringify(cartMap));
      router.push("/cart");
    } catch (err) {
      console.error("Cart sync error:", err);
      router.push("/cart");
    }
  };

  const totalCalculatedCases =
    parsedLines?.reduce((sum, l) => sum + (l.matchedSku ? l.resolvedQtyCases : 0), 0) || 0;

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
                {lang === "hi" ? "त्वरित आर्डर (मैसेज पेस्ट)" : "Quick Order (WhatsApp Paste)"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {lang === "hi"
                  ? "हिंग्लिश, अंग्रेजी या हिंदी में आर्डर पेस्ट करें"
                  : "Instant multilingual parser: Hinglish, English, or हिंदी"}
              </p>
            </div>
          </div>

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
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Text Input Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>{lang === "hi" ? "व्हाट्सएप संदेश पेस्ट करें:" : "Paste Customer Message:"}</span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Sub-10ms Non-AI Engine
            </span>
          </div>

          <textarea
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`e.g.\nbhaiya 5 peti biscuit chhota\n2 peti ghadi powder 1 kg\n1 peti wagh bakri chai`}
            className="w-full p-3 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white resize-none"
          />

          {/* Quick Demo Template Pills */}
          <div className="space-y-1.5 pt-1">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">
              {lang === "hi" ? "नमूना संदेश (क्लिक कर लोड करें):" : "1-Click Test Templates:"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  loadTemplate(
                    "bhaiya 5 peti biscuit chhota\n2 peti ghadi powder 1 kg\n1 peti chai wagh bakri 250"
                  )
                }
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
              >
                Template 1: Hinglish WhatsApp
              </button>
              <button
                type="button"
                onClick={() =>
                  loadTemplate(
                    "५ पेटी पारले बिस्कुट छोटा\n२ पेटी घड़ी डिटर्जेंट पाउडर\n१ पेटी वाघ बकरी चाय"
                  )
                }
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
              >
                Template 2: हिंदी Devanagari
              </button>
              <button
                type="button"
                onClick={() =>
                  loadTemplate("bhaiya 5 biscuit chhota jaldi bhejo\n2 ghadi powder")
                }
                className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-medium transition-colors"
              >
                Template 3: Unit Ambiguity Test
              </button>
              <button
                type="button"
                onClick={() =>
                  loadTemplate("detergent powder of 1 kg case of 20 mai se 15 dedo")
                }
                className="px-2.5 py-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-md font-medium transition-colors"
              >
                Template 4: Cut Pack (15 out of 20)
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || !inputText.trim()}
            className="w-full h-11 mt-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {parsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Parsing Message...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{lang === "hi" ? "आर्डर पार्स करें" : "Parse Order Text"}</span>
              </>
            )}
          </button>
        </div>

        {/* STEP 2: Parsed Line Review & Disambiguation View */}
        {parsedLines && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === "hi" ? "पहचाने गए उत्पाद" : "Parsed Order Lines"} ({parsedLines.length})
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800">
                {totalCalculatedCases} cases total
              </span>
            </div>

            <div className="space-y-3">
              {parsedLines.map((line) => {
                const sku = line.matchedSku;

                return (
                  <div
                    key={line.id}
                    className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 transition-colors ${
                      line.isAmbiguous
                        ? "border-amber-300 bg-amber-50/20"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Top: Raw Utterance + Confidence Chip */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="text-xs font-mono text-slate-500">
                        <span className="font-bold text-slate-700">Raw: </span>
                        <span>"{line.rawUtterance}"</span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ${
                          line.confidence >= 0.8
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {Math.round(line.confidence * 100)}% match
                      </span>
                    </div>

                    {/* Matched SKU Details */}
                    {sku ? (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {sku.brand}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                            {sku.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            ₹{sku.dealerPrice.toFixed(2)}/case • {sku.unitsPerCase} packs/case
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold font-mono text-slate-900 block">
                            ₹
                            {Math.round(
                              (line.resolvedQtyCases || 0) * sku.dealerPrice +
                                (line.resolvedQtyPacks || 0) * sku.packPrice
                            ).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {(line.resolvedQtyCases || 0) > 0 && `${line.resolvedQtyCases} cases`}
                            {(line.resolvedQtyCases || 0) > 0 && (line.resolvedQtyPacks || 0) > 0 && " + "}
                            {(line.resolvedQtyPacks || 0) > 0 && `${line.resolvedQtyPacks} packs`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-lg p-3 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Could not match product for "{line.rawUtterance}". Select an SKU below:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {allSkus.slice(0, 6).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => manuallyAssignSku(line.id, s)}
                              className="px-2 py-1 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-300 hover:border-emerald-500 rounded text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                            >
                              + {s.brand} {s.name.split(",")[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AMBIGUITY GUARDRAIL CARD (Rule [A16]: Missing Unit) */}
                    {line.isAmbiguous && line.ambiguityReason === "MISSING_UNIT" && sku && (
                      <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-3 text-xs text-amber-950 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                          <span>
                            {lang === "hi"
                              ? "यूनिट स्पष्ट नहीं है! क्या मतलब था?"
                              : "Unit not specified! Please clarify customer intent:"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          Customer wrote "{line.extractedQty} {sku.brand}". Choose wholesale master cases or loose packets:
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => resolveUnit(line.id, "CASE")}
                            className="p-2 rounded-lg border border-emerald-400 bg-white hover:bg-emerald-50 text-left cursor-pointer transition-colors shadow-2xs"
                          >
                            <span className="block font-bold text-emerald-900">
                              {line.extractedQty} Master Cases
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {(line.extractedQty || 1) * sku.unitsPerCase} packs · ₹
                              {Math.round((line.extractedQty || 1) * sku.dealerPrice).toLocaleString("en-IN")}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => resolveUnit(line.id, "PACK")}
                            className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-left cursor-pointer transition-colors shadow-2xs"
                          >
                            <span className="block font-bold text-slate-900">
                              {line.extractedQty} Loose Packs
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ₹{((line.extractedQty || 1) * sku.packPrice).toFixed(2)} retail value
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* BROKEN MASTER CASE GUARDRAIL CARD (Rule [A36]: Partial Case / Cut Pack) */}
                    {line.isAmbiguous && line.ambiguityReason === "BROKEN_CASE" && sku && (
                      <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-3 text-xs text-amber-950 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700" />
                          <span>
                            {lang === "hi"
                              ? "खुली पेटी / कट पैक आर्डर (Broken Master Case Request):"
                              : "Partial / Broken Case Request (कट पैक):"}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          Customer requested <strong>{line.brokenCaseInfo?.requestedPacks} loose packs</strong> out of a sealed <strong>Case of {line.brokenCaseInfo?.caseCapacity}</strong>.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => resolveBrokenCase(line.id, "KEEP_LOOSE")}
                            className="p-2.5 bg-emerald-700 text-white rounded-lg text-left hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                          >
                            <span className="font-bold block text-xs">
                              ✓ {line.brokenCaseInfo?.requestedPacks} Loose Packs (₹{((line.brokenCaseInfo?.requestedPacks || 0) * (line.brokenCaseInfo?.loosePackPrice || 0)).toFixed(2)})
                            </span>
                            <span className="text-[10px] text-emerald-100 block">
                              Order exact requested quantity as loose packets
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => resolveBrokenCase(line.id, "ROUND_UP")}
                            className="p-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg text-left hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                          >
                            <span className="font-bold block text-xs">
                              {line.brokenCaseInfo?.fullCaseRoundUp} Full Case ({line.brokenCaseInfo?.caseCapacity} packs)
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              ₹{line.brokenCaseInfo?.fullCasePrice.toFixed(2)} • Sealed wholesale case
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quantity Stepper & Removal */}
                    {!line.isAmbiguous && sku && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-xs text-slate-600 font-medium">
                          {(line.resolvedQtyPacks || 0) > 0
                            ? `${line.resolvedQtyPacks} Loose Packets`
                            : `${(line.resolvedQtyCases || 0) * sku.unitsPerCase} total retail packs`}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              type="button"
                              onClick={() => updateLineQty(line.id, -1)}
                              className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-10 text-center font-bold text-sm font-mono text-slate-900">
                              {(line.resolvedQtyPacks || 0) > 0 ? line.resolvedQtyPacks : line.resolvedQtyCases}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateLineQty(line.id, 1)}
                              className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* STEP 3: Commit to Cart Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleMoveToCart}
                disabled={
                  !parsedLines ||
                  parsedLines.reduce(
                    (sum, l) =>
                      sum + (l.matchedSku ? (l.resolvedQtyCases || 0) + (l.resolvedQtyPacks || 0) : 0),
                    0
                  ) === 0
                }
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  {lang === "hi"
                    ? `पुष्टि करें और कार्ट में जोड़ें →`
                    : `Confirm & Move to Cart →`}
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Nav */}
      <BottomNav activeTab="quick-order" lang={lang} />
    </div>
  );
}
