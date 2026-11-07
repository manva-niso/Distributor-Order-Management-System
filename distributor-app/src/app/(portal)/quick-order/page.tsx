"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Send,
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
  Camera,
  Mic,
  UploadCloud,
  FileAudio,
  Image as ImageIcon,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { SeedSku } from "@/db/seed-data";
import { ParsedLineItem } from "@/lib/ai/types";
import BottomNav from "@/components/layout/BottomNav";
import { getCartStorageKey, getMediaStorageKey, loadScopedCart, saveScopedCart } from "@/lib/catalogue/cart-storage";
import { useLiveStock } from "@/lib/catalogue/useLiveStock";
import { TRADE_DICT, getSkuDisplay, Language } from "@/lib/i18n/trade-dict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type InputMode = "text" | "photo" | "voice";

export default function QuickOrderPage() {
  const router = useRouter();
  const { getStock, isOutOfStock } = useLiveStock();

  const { lang, setLang } = useLanguage();
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [inputText, setInputText] = useState(
    "bhaiya 5 peti biscuit chhota\n2 peti ghadi powder 1 kg\n1 peti chai wagh bakri 250"
  );
  const [allSkus, setAllSkus] = useState<SeedSku[]>([]);
  const [retailerId, setRetailerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isolabs_current_retailer_id");
    }
    return null;
  });
  const [parsing, setParsing] = useState(false);
  const [parsedLines, setParsedLines] = useState<ParsedLineItem[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cloud Media Upload State (Neon Object Storage)
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<"image" | "audio" | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/catalogue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.skus) setAllSkus(data.skus);
          if (data.retailer) {
            setRetailerId(data.retailer.id);
            try {
              localStorage.setItem("isolabs_current_retailer_id", data.retailer.id);
            } catch {}
          }
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      window.location.href = "/login";
    }
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

// 3G Network Optimization: Compress large smartphone camera photos (< 150KB) before transit
function compressImageFor3g(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.createImageBitmap) {
      return resolve(file);
    }
    createImageBitmap(file)
      .then((bmp) => {
        const maxDim = 1280;
        let { width, height } = bmp;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        ctx.drawImage(bmp, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          "image/jpeg",
          0.82
        );
      })
      .catch(() => resolve(file));
  });
}

  // Upload Photo or Audio to Neon Object Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "audio") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setErrorMsg(null);
    setMediaFileName(file.name);

    try {
      let uploadPayload: File | Blob = file;
      if (type === "image" && file.type.startsWith("image/")) {
        uploadPayload = await compressImageFor3g(file);
      }

      const formData = new FormData();
      formData.append("file", uploadPayload, file.name);
      formData.append("mediaType", type);

      const res = await fetch("/api/upload/media", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to process uploaded file.");
        setUploadingMedia(false);
        return;
      }

      setUploadedMediaUrl(data.mediaUrl);
      setUploadedMediaType(type);
      if (data.rawText) {
        setInputText(data.rawText);
      }
      if (data.lines) {
        setParsedLines(data.lines);
      }
    } catch {
      setErrorMsg("Network error uploading media to cloud storage.");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Instant 1-Click Simulation for Demos & Evaluations
  const handleSimulateMedia = async (type: "image" | "audio") => {
    setUploadingMedia(true);
    setErrorMsg(null);
    const demoName =
      type === "image" ? "kirana_handwritten_slip.jpg" : "jabalpur_hindi_voice_note.m4a";
    setMediaFileName(demoName);

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
        setUploadingMedia(false);
        return;
      }

      setUploadedMediaUrl(data.mediaUrl);
      setUploadedMediaType(type);
      if (data.rawText) {
        setInputText(data.rawText);
      }
      if (data.lines) {
        setParsedLines(data.lines);
      }
    } catch {
      setErrorMsg("Failed to simulate media capture.");
    } finally {
      setUploadingMedia(false);
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
      const activeRetailerId =
        retailerId ||
        (typeof window !== "undefined" ? localStorage.getItem("isolabs_current_retailer_id") : null);

      const cartMap = loadScopedCart(activeRetailerId);

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

      saveScopedCart(cartMap, activeRetailerId);

      // Save media attachments to order session
      const mediaKey = getMediaStorageKey(activeRetailerId);
      const mediaPayload = {
        mediaUrl: uploadedMediaUrl || undefined,
        mediaType: uploadedMediaType || undefined,
        orderSource: "WHATSAPP_AI",
        rawUtterance: inputText,
      };
      localStorage.setItem(mediaKey, JSON.stringify(mediaPayload));
      localStorage.setItem("isolabs_order_media", JSON.stringify(mediaPayload));

      router.push("/cart");
    } catch (err) {
      console.error("Cart sync error:", err);
      router.push("/cart");
    }
  };

  const totalCalculatedCases =
    parsedLines?.reduce((sum, l) => sum + (l.matchedSku ? l.resolvedQtyCases : 0), 0) || 0;

  const t = TRADE_DICT[lang];

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans antialiased">
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl min-h-screen bg-white flex flex-col md:shadow-xl md:border-x md:border-slate-200/80 pb-28 relative">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/catalogue"
              className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {lang === "hi" ? "बोलकर या लिखकर आर्डर" : "Quick Order"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {lang === "hi"
                  ? "मैसेज, पर्चे की फोटो या हिंदी वॉइस नोट से आर्डर करें"
                  : "Order via WhatsApp text, paper slip photo, or Hindi voice note"}
              </p>
            </div>
          </div>

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

      <main className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Multi-Modal Capture Mode Selector (Rule: Text, Photo, Hindi Voice Note) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setInputMode("text")}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inputMode === "text"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === "hi" ? "मैसेज पेस्ट" : "WhatsApp Text"}</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("photo")}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inputMode === "photo"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === "hi" ? "पर्चे की फोटो" : "Slip Photo"}</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("voice")}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inputMode === "voice"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === "hi" ? "हिंदी वॉइस नोट" : "Hindi Voice"}</span>
          </button>
        </div>

        {/* MODE 1: Text / WhatsApp Input */}
        {inputMode === "text" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <span>{lang === "hi" ? "व्हाट्सएप संदेश पेस्ट करें:" : "Paste Customer Message:"}</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Deterministic Engine
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
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors cursor-pointer"
                >
                  {lang === "hi" ? "नमूना 1: हिंग्लिश व्हाट्सएप" : "Template 1: Hinglish WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadTemplate(
                      "५ पेटी पारले बिस्कुट छोटा\n२ पेटी घड़ी डिटर्जेंट पाउडर\n१ पेटी वाघ बकरी चाय"
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors cursor-pointer"
                >
                  {lang === "hi" ? "नमूना 2: शुद्ध देवनागरी" : "Template 2: हिंदी Devanagari"}
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("10 peti chips")}
                  className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-md font-bold transition-colors cursor-pointer"
                  title="Test out-of-catalog rejection (never biscuits!)"
                >
                  {lang === "hi" ? "🚫 चिप्स (कैटलॉग से बाहर)" : "🚫 Chips (Out of Catalog)"}
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("5 dabba amul ghee")}
                  className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold transition-colors cursor-pointer"
                  title="Test packaging disambiguation"
                >
                  {lang === "hi" ? "⚖️ घी (1L या 500ml डब्बा)" : "⚖️ Ghee (1L vs 500ml)"}
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("40 packet maggi")}
                  className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-md font-bold transition-colors cursor-pointer"
                  title="Test broken-case cut pack (40 < 96 units/case)"
                >
                  {lang === "hi" ? "📦 मैगी (खुले पैकेट)" : "📦 Maggi (Cut-Pack)"}
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
                  <span>{t.parsing}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t.parseOrderMessage}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* MODE 2: Photo of Handwritten Paper List */}
        {inputMode === "photo" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>{lang === "hi" ? "किराना पर्चे की फोटो खींचें / अपलोड करें:" : "Kirana Slip Photo Capture:"}</span>
              </label>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Neon Object Storage Live
              </span>
            </div>

            {/* Photo Dropzone / Camera Trigger */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-5 text-center transition-colors bg-slate-50/70">
              <input
                type="file"
                id="slip-photo-input"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileUpload(e, "image")}
                className="hidden"
                disabled={uploadingMedia}
              />
              <label
                htmlFor="slip-photo-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  {uploadingMedia ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-slate-800">
                    {uploadingMedia ? "Uploading to Cloud Storage..." : "Tap to Snap Photo or Choose File"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Supports camera capture on phone or JPG/PNG/WEBP files
                  </div>
                </div>
              </label>
            </div>

            {/* Cloud Storage Upload Confirmation & Preview */}
            {uploadedMediaUrl && uploadedMediaType === "image" && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Uploaded to Cloud: {mediaFileName || "paper_slip.jpg"}</span>
                  </span>
                  <a
                    href={uploadedMediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>View Cloud File</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="max-h-36 overflow-hidden rounded-md border border-emerald-200 bg-white flex items-center justify-center">
                  <img
                    src={uploadedMediaUrl}
                    alt="Uploaded paper slip"
                    className="w-full h-auto max-h-36 object-contain"
                  />
                </div>
              </div>
            )}

            {/* 1-Click Instant Photo Demo Button */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                Want to test without camera?
              </span>
              <button
                type="button"
                onClick={() => handleSimulateMedia("image")}
                disabled={uploadingMedia}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md transition-colors cursor-pointer"
              >
                ⚡ 1-Click Kirana Slip Test
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: Hindi Voice Note */}
        {inputMode === "voice" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-700" />
                <span>{lang === "hi" ? "हिंदी वॉइस नोट आर्डर:" : "Hindi Voice Note Capture:"}</span>
              </label>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Neon Object Storage Live
              </span>
            </div>

            {/* Audio Dropzone / File Picker */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-5 text-center transition-colors bg-slate-50/70">
              <input
                type="file"
                id="voice-note-input"
                accept="audio/*"
                onChange={(e) => handleFileUpload(e, "audio")}
                className="hidden"
                disabled={uploadingMedia}
              />
              <label
                htmlFor="voice-note-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  {uploadingMedia ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-slate-800">
                    {uploadingMedia ? (lang === "hi" ? "ऑडियो तैयार हो रहा है..." : "Transcribing & Storing Audio...") : t.uploadAudioPrompt}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.audioFormatsSupport}
                  </div>
                </div>
              </label>
            </div>

            {/* Cloud Storage Audio Player & Preview */}
            {uploadedMediaUrl && uploadedMediaType === "audio" && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Uploaded to Cloud: {mediaFileName || "voice_note.m4a"}</span>
                  </span>
                  <a
                    href={uploadedMediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>Download Audio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <audio controls src={uploadedMediaUrl} className="w-full h-9" />
              </div>
            )}

            {/* 1-Click Instant Voice Demo Button */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                {lang === "hi" ? "ऑडियो तुरंत टेस्ट करना चाहते हैं?" : "Want to test audio instantly?"}
              </span>
              <button
                type="button"
                onClick={() => handleSimulateMedia("audio")}
                disabled={uploadingMedia}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md transition-colors cursor-pointer"
              >
                {t.instantVoiceTest}
              </button>
            </div>
          </div>
        )}

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
                        {Math.round(line.confidence * 100)}% {lang === "hi" ? "सटीक मिलान" : "match"}
                      </span>
                    </div>

                    {/* Matched SKU Details */}
                    {sku ? (
                      (() => {
                        const skuDisplay = getSkuDisplay(sku, lang);
                        return (
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {skuDisplay.brand}
                                  </span>
                                  {getStock(sku.id, sku.stockCases) <= 0 ? (
                                    <span className="text-[10px] font-bold text-red-800 bg-red-100 px-1.5 py-0.5 rounded">
                                      {t.outOfStock}
                                    </span>
                                  ) : getStock(sku.id, sku.stockCases) <= 10 ? (
                                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                      {t.casesLeft(getStock(sku.id, sku.stockCases))}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      {t.inStock(getStock(sku.id, sku.stockCases))}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                                  {skuDisplay.name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                  ₹{sku.dealerPrice.toFixed(2)}{t.perCase} • {sku.unitsPerCase} {t.packsPerCase}
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
                                  {(line.resolvedQtyCases || 0) > 0 && `${line.resolvedQtyCases} ${lang === "hi" ? "पेटी" : "cases"}`}
                                  {(line.resolvedQtyCases || 0) > 0 && (line.resolvedQtyPacks || 0) > 0 && " + "}
                                  {(line.resolvedQtyPacks || 0) > 0 && `${line.resolvedQtyPacks} ${lang === "hi" ? "पैकेट" : "packs"}`}
                                </span>
                              </div>
                            </div>

                            {line.reasoning && (
                              <div className="flex items-start gap-1.5 text-[11px] text-emerald-900 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>
                                  <strong className="font-semibold text-emerald-700">
                                    {line.source === "gemini"
                                      ? (lang === "hi" ? "AI भाषा मिलान: " : "AI Semantic Match: ")
                                      : (lang === "hi" ? "सीधा कैटलॉग मिलान: " : "Direct Catalog Match: ")}
                                  </strong>
                                  {line.reasoning}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-lg p-3 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{lang === "hi" ? `"${line.rawUtterance}" के लिए उत्पाद नहीं मिला। नीचे से चुनें:` : `Could not match product for "${line.rawUtterance}". Select an SKU below:`}</span>
                        </div>

                        {line.reasoning && (
                          <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded border border-amber-200">
                            <span className="font-bold text-amber-800">
                              {line.source === "gemini"
                                ? "💡 AI Order Analysis: "
                                : (lang === "hi" ? "📋 कैटलॉग जांच: " : "📋 Catalog Check: ")}
                            </span>
                            <span>{line.reasoning}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {allSkus.slice(0, 6).map((s) => {
                            const sDisp = getSkuDisplay(s, lang);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => manuallyAssignSku(line.id, s)}
                                className="px-2 py-1 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-300 hover:border-emerald-500 rounded text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                              >
                                + {sDisp.brand} {sDisp.name.split(",")[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AMBIGUITY GUARDRAIL CARD (Rule [A16]: Missing Unit or Ambiguous "Dabba") */}
                    {line.isAmbiguous && (line.ambiguityReason === "MISSING_UNIT" || line.ambiguityReason === "AMBIGUOUS_UNIT") && sku && (
                      <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-3 text-xs text-amber-950 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                          <span>
                            {line.ambiguityReason === "AMBIGUOUS_UNIT"
                              ? lang === "hi"
                                ? "डब्बा / डिब्बा (Ambiguous Packaging) - क्या मतलब था?"
                                : "Ambiguous Packaging Unit ('Dabba') - Please Clarify Intent:"
                              : lang === "hi"
                                ? "यूनिट स्पष्ट नहीं है! क्या मतलब था?"
                                : "Unit not specified! Please clarify customer intent:"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          {line.ambiguityReason === "AMBIGUOUS_UNIT"
                            ? lang === "hi"
                              ? `ग्राहक ने "${line.extractedQty} डब्बा" लिखा है। जबलपुर किराना में डब्बा का अर्थ मास्टर पेटी या इनर बॉक्स/टिन दोनों हो सकता है:`
                              : `Customer wrote "${line.extractedQty} dabba". In Jabalpur FMCG trade, 'dabba' can mean a master case (peti) or an inner box / tin:`
                            : `Customer wrote "${line.extractedQty} ${sku.brand}". Choose wholesale master cases or loose packets:`}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => resolveUnit(line.id, "CASE")}
                            className="p-2 rounded-lg border border-emerald-400 bg-white hover:bg-emerald-50 text-left cursor-pointer transition-colors shadow-2xs"
                          >
                            <span className="block font-bold text-emerald-900">
                              {line.extractedQty} {lang === "hi" ? "मास्टर पेटी" : "Master Cases (पेटी)"}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {(line.extractedQty || 1) * sku.unitsPerCase} {lang === "hi" ? "पैकेट" : "packs"} · ₹
                              {Math.round((line.extractedQty || 1) * sku.dealerPrice).toLocaleString("en-IN")}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => resolveUnit(line.id, "PACK")}
                            className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-left cursor-pointer transition-colors shadow-2xs"
                          >
                            <span className="block font-bold text-slate-900">
                              {line.extractedQty} {lang === "hi" ? "खुले पैकेट / डिब्बे" : "Loose Packs / Boxes"}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ₹{((line.extractedQty || 1) * sku.packPrice).toFixed(2)} {lang === "hi" ? "खुदरा मूल्य" : "retail value"}
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
                              ? "खुली पेटी / कट पैक आर्डर:"
                              : "Partial / Broken Case Request (कट पैक):"}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {lang === "hi" ? (
                            <>ग्राहक ने सीलबंद <strong>{line.brokenCaseInfo?.caseCapacity} पैकेट की पेटी</strong> में से <strong>{line.brokenCaseInfo?.requestedPacks} खुले पैकेट</strong> मांगे हैं:</>
                          ) : (
                            <>Customer requested <strong>{line.brokenCaseInfo?.requestedPacks} loose packs</strong> out of a sealed <strong>Case of {line.brokenCaseInfo?.caseCapacity}</strong>.</>
                          )}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => resolveBrokenCase(line.id, "KEEP_LOOSE")}
                            className="p-2.5 bg-emerald-700 text-white rounded-lg text-left hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                          >
                            <span className="font-bold block text-xs">
                              ✓ {line.brokenCaseInfo?.requestedPacks} {lang === "hi" ? "खुले पैकेट" : "Loose Packs"} (₹{((line.brokenCaseInfo?.requestedPacks || 0) * (line.brokenCaseInfo?.loosePackPrice || 0)).toFixed(2)})
                            </span>
                            <span className="text-[10px] text-emerald-100 block">
                              {lang === "hi" ? "मांगे गए सटीक खुले पैकेट आर्डर करें" : "Order exact requested quantity as loose packets"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => resolveBrokenCase(line.id, "ROUND_UP")}
                            className="p-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg text-left hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                          >
                            <span className="font-bold block text-xs">
                              {line.brokenCaseInfo?.fullCaseRoundUp} {lang === "hi" ? "पूरी पेटी" : "Full Case"} ({line.brokenCaseInfo?.caseCapacity} {lang === "hi" ? "पैकेट" : "packs"})
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              ₹{line.brokenCaseInfo?.fullCasePrice.toFixed(2)} • {lang === "hi" ? "सीलबंद थोक पेटी" : "Sealed wholesale case"}
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
                            ? `${line.resolvedQtyPacks} ${lang === "hi" ? "खुले पैकेट" : "Loose Packets"}`
                            : `${(line.resolvedQtyCases || 0) * sku.unitsPerCase} ${lang === "hi" ? "कुल पैकेट" : "total retail packs"}`}
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
    </div>
  );
}
