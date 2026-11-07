"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Boxes,
  Users,
  Store,
  Layers,
  Database,
  Tag,
  ShieldCheck,
  PackageCheck,
  Search,
  RotateCcw,
  Trash2,
  Building2,
} from "lucide-react";

type Language = "en" | "hi";

interface StoreStats {
  totalSkus: number;
  totalRetailers: number;
  totalOrders: number;
  totalStockCases: number;
  totalWholesaleValue: number;
}

interface SkuSummary {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  packSize: string;
  unitsPerCase: number;
  dealerPrice: number;
  stockCases: number;
  schemeType: string;
  gstRate: number;
}

interface RetailerSummary {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  route: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
}

export default function SetupPage() {
  const router = useRouter();

  const [lang, setLang] = useState<Language>("en");
  const [activeTab, setActiveTab] = useState<"upload" | "presets" | "browse">("upload");
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [dbInfo, setDbInfo] = useState<{
    configured: boolean;
    connected: boolean;
    skusCount: number;
    retailersCount: number;
    ordersCount: number;
  } | null>(null);
  const [skus, setSkus] = useState<SkuSummary[]>([]);
  const [retailers, setRetailers] = useState<RetailerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);

  // Search filter in browse tab
  const [browseQuery, setBrowseQuery] = useState("");

  // Master Reset database state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetChoice, setResetChoice] = useState<"clean_slate" | "factory_demo" | "absolute_zero">("clean_slate");

  const handleResetDatabase = async (mode: "clean_slate" | "factory_demo" | "absolute_zero") => {
    setResetting(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const res = await fetch("/api/setup/reset-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadSuccess(data.message);
        setShowResetModal(false);
        await loadStatus();
      } else {
        setUploadError(data.error || "Failed to reset database.");
      }
    } catch {
      setUploadError("Network error while resetting database.");
    } finally {
      setResetting(false);
    }
  };

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/setup/status");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setSkus(data.skus || []);
        setRetailers(data.retailers || []);
        if (data.database) {
          setDbInfo(data.database);
        }
      }
    } catch (err) {
      console.error("Failed to load setup status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadSuccess(null);
      setUploadError(null);
      setUploadWarnings([]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadSuccess(null);
    setUploadError(null);
    setUploadWarnings([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", importMode);

      const res = await fetch("/api/setup/import-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setUploadError(data.error || "Import failed. Please check Excel columns.");
        if (data.errors) setUploadWarnings(data.errors);
        setUploading(false);
        return;
      }

      setUploadSuccess(data.message);
      if (data.warnings && data.warnings.length > 0) {
        setUploadWarnings(data.warnings);
      }
      setSelectedFile(null);
      await loadStatus();
    } catch {
      setUploadError("Network error during file upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleLoadPreset = async (presetKey: string) => {
    setLoading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const res = await fetch("/api/setup/load-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: presetKey }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadSuccess(data.message);
        await loadStatus();
      } else {
        setUploadError(data.error || "Failed to apply preset.");
      }
    } catch {
      setUploadError("Failed to apply preset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {lang === "hi" ? "मास्टर डेटा सेटअप व एक्सेल इम्पोर्टर" : "Master Data & Excel Importer"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {lang === "hi"
                  ? "वितरक सूची और किराना खातों को एक्सेल द्वारा लाइव लोड करें"
                  : "Ingest custom SKUs, prices, schemes & retailers via Excel (.xlsx / .csv)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setResetChoice("absolute_zero");
                setShowResetModal(true);
              }}
              className="h-8 px-3 text-xs font-bold rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Master Delete (Wipe Everything to 0 Records)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "मास्टर डिलीट (सब मिटाएं)" : "Master Delete (Wipe All)"}</span>
            </button>

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
            <Link
              href="/desk"
              className="h-8 px-3 text-xs font-bold rounded-md bg-emerald-800 text-white hover:bg-emerald-900 shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === "hi" ? "आर्डर डेस्क" : "Order Desk"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        {/* Live Warehouse & Database Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Boxes className="w-4 h-4 text-emerald-700" />
              <span>{lang === "hi" ? "सक्रिय उत्पाद" : "Active SKUs"}</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {stats?.totalSkus || 0}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{lang === "hi" ? "पंजीकृत किराना" : "Kirana Counters"}</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {stats?.totalRetailers || 0}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <PackageCheck className="w-4 h-4 text-amber-600" />
              <span>{lang === "hi" ? "गोदाम पेटी स्टॉक" : "Warehouse Stock"}</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {stats?.totalStockCases?.toLocaleString("en-IN") || 0} cases
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Tag className="w-4 h-4 text-purple-600" />
              <span>{lang === "hi" ? "कुल थोक मूल्य" : "Wholesale Value"}</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              ₹{(stats?.totalWholesaleValue || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Neon PostgreSQL Live Database Status Strip */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                dbInfo?.connected
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {lang === "hi" ? "नियॉन पोस्टग्रेएसक्यूएल डेटाबेस" : "Neon PostgreSQL Cloud Database"}
                </span>
                {dbInfo?.connected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {lang === "hi" ? "लाइव कनेक्टेड" : "Live Synced"}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    In-Memory Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {dbInfo?.connected
                  ? `Database rows: ${dbInfo.skusCount} SKUs, ${dbInfo.retailersCount} Retailers, ${dbInfo.ordersCount} Orders stored in PostgreSQL.`
                  : "Database running in local in-memory store. Connect DATABASE_URL in .env.local to persist."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleLoadPreset("master")}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "मास्टर डेटाबेस लोड करें" : "Sync Master Database"}</span>
            </button>
          </div>
        </div>

        {/* First-Time User 3-Step Walkthrough Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>{lang === "hi" ? "नया उपयोगकर्ता? 1-मिनट में अपनी दुकान शुरू करें" : "First-Time User? 1-Minute Custom Setup"}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold leading-snug">
            {lang === "hi"
              ? "अपनी एक्सेल शीट अपलोड करें या 1-क्लिक में जबलपुर एफएमसीजी डेटा लोड करें"
              : "Upload your existing distributor Excel sheet or load our realistic Jabalpur FMCG preset"}
          </h2>
          <div className="grid sm:grid-cols-3 gap-2.5 text-xs text-emerald-100 pt-1">
            <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
              <strong className="block text-white font-bold mb-0.5">1. Upload Sheet</strong>
              Drop any .xlsx/.csv with Item names, wholesale prices, schemes & stock.
            </div>
            <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
              <strong className="block text-white font-bold mb-0.5">2. Auto-Configured</strong>
              App instantly generates pack rates, GST brackets & credit ledgers.
            </div>
            <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
              <strong className="block text-white font-bold mb-0.5">3. Live Ordering</strong>
              Shopkeepers order via Catalogue or AI message quick order.
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "upload"
                ? "border-emerald-700 text-emerald-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{lang === "hi" ? "एक्सेल अपलोड करें" : "Upload Custom Excel"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "presets"
                ? "border-emerald-700 text-emerald-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{lang === "hi" ? "रेडीमेड डेटासेट" : "1-Click FMCG Presets"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("browse")}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "browse"
                ? "border-emerald-700 text-emerald-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{lang === "hi" ? "सक्रिय डेटा देखें" : "View Active Records"}</span>
          </button>
        </div>

        {/* Notifications */}
        {uploadSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 text-xs flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Success!</div>
              <div>{uploadSuccess}</div>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-50 border border-red-300 text-red-900 rounded-xl p-4 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Import Error</div>
              <div>{uploadError}</div>
            </div>
          </div>
        )}

        {/* TAB 1: UPLOAD EXCEL / CSV */}
        {activeTab === "upload" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === "hi" ? "थोक मूल्य सूची या ग्राहक शीट अपलोड करें" : "Ingest Distributor Excel Workbook"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supports .xlsx, .xls, or .csv files with SKU items and/or Retailer accounts.
                </p>
              </div>

              {/* Download Template Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href="/api/setup/template?type=master"
                  download="distributor_master_template.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Excel Template</span>
                </a>
              </div>
            </div>

            {/* Drop / Upload Container */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                id="excelInput"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="excelInput"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 hover:text-emerald-700 block">
                    {selectedFile ? selectedFile.name : "Click to select or drag and drop Excel sheet"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready to Ingest`
                      : ".XLSX, .XLS, or .CSV (Up to 10 MB)"}
                  </span>
                </div>
              </label>
            </div>

            {/* Ingestion Mode Radio */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700">
                {lang === "hi" ? "इम्पोर्ट का प्रकार: " : "Import Strategy: "}
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Replace Entire Existing Catalog</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="merge"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Append / Update Matching SKUs</span>
                </label>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Parsing Excel Sheet & Updating Database...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Ingest Sheet & Apply to Live Application</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: 1-CLICK INDUSTRY PRESETS */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === "hi" ? "1-क्लिक उद्योग रेडीमेड डेटासेट" : "Instant 1-Click Industry Presets"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Don't have an Excel sheet on hand? Choose a preset to populate realistic products, schemes, and kiranas in 1 second.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {/* Preset 1: Full Master Enterprise Database (36 SKUs) */}
                <div className="border-2 border-emerald-600 rounded-xl p-4 bg-emerald-50/50 flex flex-col justify-between space-y-3 relative shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase bg-emerald-700 text-white px-2 py-0.5 rounded shadow-2xs">
                        🌟 Master Database
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800">
                        36 SKUs
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2">
                      Master Wholesale FMCG
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Complete authentic catalog across all 7 categories (Parle, Britannia, Tata Tea, Fortune Oil & 15L Tin, Ghadi, Surf, Dettol, Maggi, Vim) + 8 Kiranas on Jabalpur beats. Persists directly to Neon PostgreSQL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset("master")}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Load Master Database (36 SKUs)
                  </button>
                </div>

                {/* Preset 2: Company A Jabalpur Core FMCG (12 SKUs) */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                        Core Baseline
                      </span>
                      <span className="text-[10px] font-bold text-slate-600">
                        12 SKUs
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2">
                      Company A Core FMCG
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      12 high-velocity baseline SKUs (Parle-G, Good Day, Marie, Ghadi 1kg & cake, Surf Excel, Wagh Bakri, Tata Tea Gold, Dettol, Fortune Oil) + 8 Kirana accounts. Persists to Neon PostgreSQL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset("company_a")}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Load Company A Core
                  </button>
                </div>

                {/* Preset 3: Packaged Foods & Grocery */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Food & Staples
                      </span>
                      <span className="text-[10px] font-bold text-blue-700">
                        19 SKUs
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2">
                      Grocery & Packaged Foods
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Biscuits, Teas, Coffees, Edible Oils, Ghee, Maggi noodles, and Spices with Buy 10 Get 1 free and 4% slab tier discounts. Persists to Neon PostgreSQL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset("fmcg_food")}
                    className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Load Food & Grocery Preset
                  </button>
                </div>

                {/* Preset 4: Home Care & Cleaning */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                        Hygiene
                      </span>
                      <span className="text-[10px] font-bold text-purple-700">
                        17 SKUs
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2">
                      Home Care & Detergents
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Ghadi, Surf Excel, Wheel, Laundry cakes, Vim Bar, Harpic, and Dettol soaps with slab discounts and 18% standard GST brackets. Persists to Neon PostgreSQL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset("home_hygiene")}
                    className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Load Home Care Preset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BROWSE ACTIVE RECORDS */}
        {activeTab === "browse" && (
          <div className="space-y-4">
            {/* Search Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={browseQuery}
                  onChange={(e) => setBrowseQuery(e.target.value)}
                  placeholder="Filter SKUs or Kiranas..."
                  className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {skus.length} SKUs • {retailers.length} Retailers active
              </span>
            </div>

            {/* SKUs Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider">
                Active Catalog SKUs
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">SKU Name</th>
                      <th className="py-2.5 px-3">Brand</th>
                      <th className="py-2.5 px-3">Pack Spec</th>
                      <th className="py-2.5 px-3 text-right">Case Price (Ex-GST)</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3">Scheme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {skus
                      .filter((s) => s.name.toLowerCase().includes(browseQuery.toLowerCase()) || s.brand.toLowerCase().includes(browseQuery.toLowerCase()))
                      .map((sku) => (
                        <tr key={sku.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{sku.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{sku.brand}</td>
                          <td className="py-2.5 px-3 text-slate-500">{sku.packSize} • {sku.unitsPerCase}/case</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{sku.dealerPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                                sku.stockCases > 10
                                  ? "bg-emerald-50 text-emerald-800"
                                  : sku.stockCases > 0
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-red-50 text-red-800"
                              }`}
                            >
                              {sku.stockCases} cases
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {sku.schemeType}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Retailers Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider">
                Active Retailer Accounts & Credit Limits
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Shop Name</th>
                      <th className="py-2.5 px-3">Owner / Contact</th>
                      <th className="py-2.5 px-3">Delivery Route</th>
                      <th className="py-2.5 px-3 text-right">Credit Limit</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {retailers
                      .filter((r) => r.name.toLowerCase().includes(browseQuery.toLowerCase()) || r.phone.includes(browseQuery))
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{r.name}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {r.ownerName} • +91 {r.phone}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{r.route}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                            ₹{r.creditLimit.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                            ₹{r.availableCredit.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Link
                              href={`/login?phone=${r.phone}`}
                              className="text-[11px] font-bold text-emerald-700 hover:underline"
                            >
                              Login as Shop →
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* MASTER DATABASE RESET & CLEAN SLATE CARD */}
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-700 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-950 flex items-center gap-2">
                  <span>{lang === "hi" ? "मास्टर डेटाबेस रीसेट व क्लीन स्लेट" : "Master Database Clean Slate & Reset"}</span>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-red-200 text-red-800">
                    Presentation Tool
                  </span>
                </h3>
                <p className="text-xs text-red-800/80 mt-0.5">
                  {lang === "hi"
                    ? "उपयोगकर्ताओं या परीक्षकों को सिस्टम दिखाते समय डेटाबेस को एकदम नए जैसा (0 आर्डर) करें"
                    : "Wipe test orders, restore original stock, and reset credit balances to start product demonstrations from a clean slate."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setResetChoice("absolute_zero");
                  setShowResetModal(true);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-700 hover:bg-red-800 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === "hi" ? "मास्टर डिलीट (सब मिटाएं 0)" : "Master Delete (Wipe All to 0)"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetChoice("clean_slate");
                  setShowResetModal(true);
                }}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === "hi" ? "केवल ऑर्डर्स रीसेट" : "Wipe Orders Only"}</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs text-red-900 pt-1">
            <div className="bg-white/80 border border-red-200/80 rounded-lg p-3">
              <strong className="block text-slate-900 font-bold mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Option 1: Pristine Clean Slate (0 Orders)
              </strong>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Clears all placed orders, cart history, captured utterances, and OCC locks. Restores baseline warehouse stock (340 biscuit, 85 detergent, 0 tea) and credit headroom so the order desk queue is completely empty.
              </p>
            </div>

            <div className="bg-white/80 border border-red-200/80 rounded-lg p-3">
              <strong className="block text-slate-900 font-bold mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Option 2: Factory Jabalpur Demo State
              </strong>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Resets all tables to baseline plus the 3 standard sample orders (ORD-10482, ORD-10483 held credit, ORD-10484 verified) for desk verification and Tally XML export testing.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* DOUBLE-CONFIRMATION RESET MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === "hi" ? "डेटाबेस रीसेट की पुष्टि करें" : "Confirm Database Reset"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === "hi"
                    ? "क्या आप निश्चित रूप से डेटाबेस को रीसेट करना चाहते हैं? इससे सभी टेस्ट आर्डर मिट जाएंगे।"
                    : "This action will clear test orders and reset ledger balances. Choose your target state below:"}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  resetChoice === "absolute_zero"
                    ? "border-red-600 bg-red-50 ring-2 ring-red-600/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="resetChoice"
                  checked={resetChoice === "absolute_zero"}
                  onChange={() => setResetChoice("absolute_zero")}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <span>Absolute Zero (Wipe Everything)</span>
                    <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] rounded font-mono font-bold">0 SKUs / 0 Orders</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Deletes all SKUs, Retailers, and Orders to a completely blank slate. Ready to test onboarding from scratch.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  resetChoice === "clean_slate"
                    ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="resetChoice"
                  checked={resetChoice === "clean_slate"}
                  onChange={() => setResetChoice("clean_slate")}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Pristine Clean Slate (Recommended for Demos)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Wipes all orders to 0. Restores default stock & credit limits.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  resetChoice === "factory_demo"
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="resetChoice"
                  checked={resetChoice === "factory_demo"}
                  onChange={() => setResetChoice("factory_demo")}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Factory Jabalpur Demo State
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Restores baseline catalog + 3 pre-seeded orders (1 placed, 1 credit hold, 1 verified).
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => handleResetDatabase(resetChoice)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                {resetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Execute Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
