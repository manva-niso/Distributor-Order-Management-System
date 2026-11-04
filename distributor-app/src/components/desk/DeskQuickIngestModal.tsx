"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Sparkles,
  Camera,
  Mic,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Trash2,
  X,
  Store,
  CreditCard,
  Building2,
  Send,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { SeedSku } from "@/db/seed-data";
import { ParsedLineItem } from "@/lib/ai/types";

interface RetailerOption {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  route: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
}

interface DeskQuickIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

export default function DeskQuickIngestModal({
  isOpen,
  onClose,
  onOrderCreated,
}: DeskQuickIngestModalProps) {
  const [retailers, setRetailers] = useState<RetailerOption[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>("");
  const [allSkus, setAllSkus] = useState<SeedSku[]>([]);

  const [inputMode, setInputMode] = useState<"text" | "photo" | "voice">("text");
  const [inputText, setInputText] = useState(
    "bhaiya 5 peti biscuit chhota\n2 peti ghadi powder 1 kg\n1 peti chai wagh bakri 250"
  );
  const [parsing, setParsing] = useState(false);
  const [parsedLines, setParsedLines] = useState<ParsedLineItem[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Cloud Media Attachment State
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<"image" | "audio" | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Load retailers and catalogue SKUs
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.retailers && data.retailers.length > 0) {
          setRetailers(data.retailers);
          if (!selectedRetailerId) {
            setSelectedRetailerId(data.retailers[0].id);
          }
        }
      })
      .catch(() => {});

    fetch("/api/catalogue")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.skus) {
          setAllSkus(data.skus);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedRetailer = retailers.find((r) => r.id === selectedRetailerId) || retailers[0];

  // Quick Preset Chips for Demo & Testing
  const setTestPrompt = (text: string, preferredRetailerId?: string) => {
    setInputText(text);
    setParsedLines(null);
    setErrorMsg(null);
    setSuccessBanner(null);
    if (preferredRetailerId) {
      setSelectedRetailerId(preferredRetailerId);
    }
  };

  // Live Parsing via AI Engine
  const handleParse = async () => {
    if (!inputText.trim()) return;

    setParsing(true);
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const res = await fetch("/api/capture/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to parse text. Please check format.");
        return;
      }

      setParsedLines(data.lines || []);
    } catch {
      setErrorMsg("Network error communicating with AI parsing engine.");
    } finally {
      setParsing(false);
    }
  };

  // Simulate Media Upload (Paper Slip / Voice Note)
  const handleSimulateMedia = async (type: "image" | "audio") => {
    setUploadingMedia(true);
    setErrorMsg(null);
    const demoName =
      type === "image" ? "kirana_handwritten_slip.jpg" : "jabalpur_hindi_voice_note.m4a";

    try {
      const dummyBlob = new Blob([demoName], {
        type: type === "image" ? "image/jpeg" : "audio/m4a",
      });
      const formData = new FormData();
      formData.append("file", dummyBlob, demoName);
      formData.append("mediaType", type);

      const res = await fetch("/api/upload/media", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Media simulation failed.");
        return;
      }

      setUploadedMediaUrl(data.mediaUrl);
      setUploadedMediaType(type);
      if (data.rawText) setInputText(data.rawText);
      if (data.lines) setParsedLines(data.lines);
    } catch {
      setErrorMsg("Failed to simulate media capture.");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Ambiguity Resolution (Unit: Case vs Loose Pack)
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

  // Ambiguity Resolution (Broken Case: Round Up vs Keep Loose)
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

  // Quantity Tweak
  const updateLineQty = (lineId: string, delta: number) => {
    if (!parsedLines) return;
    setParsedLines((prev) =>
      prev!.map((line) => {
        if (line.id !== lineId) return line;
        if (line.resolvedQtyPacks && line.resolvedQtyPacks > 0) {
          return { ...line, resolvedQtyPacks: Math.max(1, line.resolvedQtyPacks + delta) };
        }
        return { ...line, resolvedQtyCases: Math.max(1, line.resolvedQtyCases + delta) };
      })
    );
  };

  // Manual SKU reassignment for out-of-catalog items
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

  const removeLine = (lineId: string) => {
    if (!parsedLines) return;
    setParsedLines((prev) => prev!.filter((l) => l.id !== lineId));
  };

  // Financial Estimation
  let estimatedTotal = 0;
  if (parsedLines) {
    for (const l of parsedLines) {
      if (l.matchedSku) {
        const casePrice = l.matchedSku.dealerPrice;
        const packPrice = l.matchedSku.packPrice || casePrice / (l.matchedSku.unitsPerCase || 24);
        estimatedTotal += (l.resolvedQtyCases || 0) * casePrice + (l.resolvedQtyPacks || 0) * packPrice;
      }
    }
  }

  const isOverCredit =
    selectedRetailer && estimatedTotal > (selectedRetailer.availableCredit || 0);

  // Ingest Order directly to Order Desk
  const handleSubmitOrder = async () => {
    if (!parsedLines || parsedLines.length === 0) {
      setErrorMsg("Please parse at least one line item before ingesting.");
      return;
    }

    const validLines = parsedLines.filter((l) => l.matchedSku != null);
    if (validLines.length === 0) {
      setErrorMsg("No recognized catalog SKUs to book. Resolve or assign items first.");
      return;
    }

    if (!selectedRetailer) {
      setErrorMsg("Please select a target kirana retailer.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        retailerId: selectedRetailer.id,
        items: validLines.map((l) => ({
          skuId: l.matchedSku!.id,
          quantityCases: l.resolvedQtyCases || 0,
          quantityPacks: l.resolvedQtyPacks || 0,
        })),
        notes: `Desk Ingest: ${inputText}`,
        orderSource: "WHATSAPP_AI",
        mediaUrl: uploadedMediaUrl || undefined,
        mediaType: uploadedMediaType || undefined,
      };

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to create order on desk.");
        return;
      }

      const order = data.order;
      setSuccessBanner(
        `Order ${order.id} captured successfully for ${selectedRetailer.name}! Status: ${order.status}${
          order.status === "CREDIT_HOLD" ? " (Credit Limit Exceeded - Credit Hold Applied)" : ""
        }`
      );

      setTimeout(() => {
        onOrderCreated(order.id);
        onClose();
      }, 1200);
    } catch {
      setErrorMsg("Network error submitting desk order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Desk Order Ingestion (WhatsApp / Phone / Voice)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Distributor Desk Seat: Capture & verify kirana orders without leaving the desk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* 1. RETAILER SELECTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-700" />
                <span>1. Select Calling Kirana Retailer</span>
              </label>
              {selectedRetailer && (
                <span className="text-[11px] font-mono text-slate-500">
                  Route: {selectedRetailer.route}
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-2 items-center">
              <div className="sm:col-span-2">
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-emerald-600"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.ownerName}) — {r.route}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRetailer && (
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Credit Limit:</span>
                    <span className="font-mono font-bold text-slate-700">
                      ₹{selectedRetailer.creditLimit?.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-slate-600">Available:</span>
                    <span
                      className={`font-mono ${
                        selectedRetailer.availableCredit <= 10000
                          ? "text-red-600 font-black"
                          : "text-emerald-700"
                      }`}
                    >
                      ₹{selectedRetailer.availableCredit?.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. MULTI-MODAL INPUT MODE SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. WhatsApp Text, Handwritten Slip, or Voice Note</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    inputMode === "text"
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("photo")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    inputMode === "photo"
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Photo Slip
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("voice")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    inputMode === "voice"
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Voice Note
                </button>
              </div>
            </div>

            {/* Test Prompts / Edge Case Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Edge Cases:
              </span>
              <button
                type="button"
                onClick={() => setTestPrompt("10 peti chips")}
                className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-2 py-0.5 rounded-md transition-colors"
                title="Test out-of-catalog rejection (should reject with UNKNOWN_SKU floor)"
              >
                🚫 10 peti chips (Out of Catalog)
              </button>
              <button
                type="button"
                onClick={() => setTestPrompt("5 dabba amul ghee")}
                className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-2 py-0.5 rounded-md transition-colors"
                title="Test dabba polysemy (1L tin vs 500ml jar)"
              >
                ⚖️ 5 dabba amul ghee (Ambiguous)
              </button>
              <button
                type="button"
                onClick={() => setTestPrompt("40 packet maggi")}
                className="text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
                title="Test broken-case cut pack (96 per case)"
              >
                📦 40 packet maggi (Broken Case)
              </button>
              <button
                type="button"
                onClick={() =>
                  setTestPrompt(
                    "30 peti tata tea gold 500g\n20 peti fortune refine 1L\n10 peti colgate 100g",
                    "RET-0003" // Gupta Daily Needs (limit ₹60,000)
                  )
                }
                className="text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 px-2 py-0.5 rounded-md transition-colors"
                title="Test Credit Breach on Gupta Daily Needs (₹84k > ₹60k limit -> CREDIT_HOLD)"
              >
                💳 Gupta Daily Needs (Credit Hold)
              </button>
            </div>

            {/* Input Box based on mode */}
            {inputMode === "text" && (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste WhatsApp text (e.g. 'bhaiya 5 peti biscuit, 2 peti tel')..."
                  className="w-full text-xs font-mono p-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            )}

            {inputMode === "photo" && (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600">
                  Upload an image of a kirana handwritten notebook slip or simulate OCR.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => handleSimulateMedia("image")}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 transition-colors shadow-xs"
                  >
                    {uploadingMedia ? "Uploading..." : "⚡ Simulate Slip OCR"}
                  </button>
                </div>
              </div>
            )}

            {inputMode === "voice" && (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                <Mic className="w-6 h-6 text-emerald-700 mx-auto animate-pulse" />
                <p className="text-xs text-slate-600">
                  Upload WhatsApp audio note (.m4a/.mp3) or simulate Hindi spoken voice note.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => handleSimulateMedia("audio")}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 transition-colors shadow-xs"
                  >
                    {uploadingMedia ? "Processing Voice..." : "🎙️ Simulate Hindi Voice Note"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={parsing || !inputText.trim()}
                onClick={handleParse}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-black transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {parsing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Vernacular AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Parse with AI Engine</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. PARSED LINE ITEMS TABLE */}
          {parsedLines && parsedLines.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden space-y-0">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Parsed Order Lines ({parsedLines.length} detected)
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  Estimated Total: ₹{Math.round(estimatedTotal).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="divide-y divide-slate-200 max-h-56 overflow-y-auto bg-white">
                {parsedLines.map((line) => {
                  const sku = line.matchedSku;
                  const isUnknown = line.ambiguityReason === "UNKNOWN_SKU" || !sku;

                  return (
                    <div key={line.id} className="p-3 text-xs space-y-1.5 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">
                              "{line.rawUtterance}"
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-black font-mono ${
                                isUnknown
                                  ? "bg-red-100 text-red-800"
                                  : line.confidence >= 0.85
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {Math.round(line.confidence * 100)}%{" "}
                              {isUnknown ? "REJECTED" : line.confidence >= 0.85 ? "HIGH" : "CHECK"}
                            </span>
                          </div>

                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {isUnknown ? (
                              <span className="text-red-700 font-black">
                                🚫 Unrecognized Item (Not in FMCG Catalog)
                              </span>
                            ) : (
                              <span>
                                {sku?.name} ({sku?.packSize})
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity & Unit Controls */}
                      {!isUnknown && (
                        <div className="flex items-center justify-between text-slate-600 pt-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateLineQty(line.id, -1)}
                              className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center hover:bg-slate-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold text-slate-900 px-1">
                              {line.resolvedQtyCases > 0
                                ? `${line.resolvedQtyCases} Peti (Cases)`
                                : `${line.resolvedQtyPacks} Packs`}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateLineQty(line.id, 1)}
                              className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center hover:bg-slate-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="font-mono font-bold text-slate-800">
                            ₹
                            {(
                              (line.resolvedQtyCases || 0) * (sku?.dealerPrice || 0) +
                              (line.resolvedQtyPacks || 0) * (sku?.packPrice || 0)
                            ).toLocaleString("en-IN")}
                          </div>
                        </div>
                      )}

                      {/* Ambiguity Actions */}
                      {line.isAmbiguous &&
                        (line.ambiguityReason === "AMBIGUOUS_UNIT" ||
                          line.ambiguityReason === "MISSING_UNIT") && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2">
                            <span className="text-[11px] text-amber-900 font-medium">
                              Unit ambiguous: Did kirana mean Cases or Loose Packs?
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => resolveUnit(line.id, "CASE")}
                                className="px-2 py-0.5 bg-amber-600 text-white font-bold rounded text-[10px]"
                              >
                                Cases (Peti)
                              </button>
                              <button
                                type="button"
                                onClick={() => resolveUnit(line.id, "PACK")}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold rounded text-[10px]"
                              >
                                Loose Packs
                              </button>
                            </div>
                          </div>
                        )}

                      {/* Broken Case Actions */}
                      {line.brokenCaseInfo && (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                          <span className="text-[11px] text-blue-900 font-medium">
                            Case is {line.brokenCaseInfo.caseCapacity} units. Round up to full case?
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => resolveBrokenCase(line.id, "ROUND_UP")}
                              className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[10px]"
                            >
                              1 Full Case
                            </button>
                            <button
                              type="button"
                              onClick={() => resolveBrokenCase(line.id, "KEEP_LOOSE")}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold rounded text-[10px]"
                            >
                              Keep Loose
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Out of Catalog Manual Selection */}
                      {isUnknown && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg space-y-1">
                          <span className="text-[11px] text-red-900 font-bold block">
                            Item not stocked. Clerk may manually link a catalog item or discard:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {allSkus.slice(0, 4).map((alt) => (
                              <button
                                key={alt.id}
                                type="button"
                                onClick={() => manuallyAssignSku(line.id, alt)}
                                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Link to: {alt.name.slice(0, 22)}...
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. REAL-TIME CREDIT PRE-CHECK STRIP */}
          {parsedLines && parsedLines.length > 0 && selectedRetailer && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                isOverCredit
                  ? "bg-red-50 border-red-300 text-red-950"
                  : "bg-emerald-50 border-emerald-300 text-emerald-950"
              }`}
            >
              <div className="flex items-center gap-2">
                {isOverCredit ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {isOverCredit
                      ? "⚠️ Credit Breach Warning: Will be placed on CREDIT_HOLD"
                      : "✅ Credit Check Passed: Clean approval"}
                  </span>
                  <span className="text-[11px] opacity-80">
                    Order Total: ₹{Math.round(estimatedTotal).toLocaleString("en-IN")} | Available Credit: ₹
                    {selectedRetailer.availableCredit.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <span className="font-mono text-sm font-black">
                ₹{Math.round(estimatedTotal).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || !parsedLines || parsedLines.length === 0}
            onClick={handleSubmitOrder}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Ingesting to Desk Queue...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ingest Order into Desk</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
