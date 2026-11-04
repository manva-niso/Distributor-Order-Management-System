"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Truck,
  Users,
  Database,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Building2,
  Phone,
  Filter,
  Download,
  Copy,
  Check,
  FileCode,
  Printer,
  MessageSquare,
  PhoneCall,
  MapPin,
  Calendar,
  Boxes,
  RotateCcw,
  Sparkles,
  Package,
  Tag,
  Plus,
  Minus,
} from "lucide-react";
import AddProductModal from "@/components/desk/AddProductModal";
import { SeedSku } from "@/db/seed-data";

interface DeskOrder {
  id: string;
  retailerId: string;
  retailerName: string;
  route?: string;
  retailerPhone?: string;
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
  totalItemsCount: number;
  totalCasesCount: number;
  occVersion: number;
  creditHoldReason?: string;
  createdAt: string;
}

interface DeskStats {
  totalOrders: number;
  needsReviewCount: number;
  creditHoldCount: number;
  verifiedCount: number;
  exportedCount: number;
  totalWholesaleValue: number;
}

type TabType = "QUEUE" | "CREDIT_HOLDS" | "CATALOGUE" | "VAN_MANIFEST" | "DORMANT";

export default function OrderDeskPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("QUEUE");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Catalogue & Inventory State (Order Desk Fills & Manages the Catalog)
  const [catalogueSkus, setCatalogueSkus] = useState<SeedSku[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [catalogueCategory, setCatalogueCategory] = useState("ALL");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [stockUpdatingSkuId, setStockUpdatingSkuId] = useState<string | null>(null);

  const fetchCatalogue = async () => {
    setLoadingCatalogue(true);
    try {
      const res = await fetch("/api/catalogue");
      const data = await res.json();
      if (data.success && data.skus) {
        setCatalogueSkus(data.skus);
      }
    } catch (err) {
      console.error("Failed to load catalog on desk:", err);
    } finally {
      setLoadingCatalogue(false);
    }
  };

  const handleStockDelta = async (skuId: string, delta: number) => {
    setStockUpdatingSkuId(skuId);
    try {
      const res = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_stock", skuId, stockDelta: delta }),
      });
      const data = await res.json();
      if (data.success && data.sku) {
        setCatalogueSkus((prev) =>
          prev.map((s) => (s.id === skuId ? { ...s, stockCases: data.sku.stockCases } : s))
        );
      }
    } catch (err) {
      console.error("Stock update error:", err);
    } finally {
      setStockUpdatingSkuId(null);
    }
  };

  // Credit Hold Release Modal State
  const [selectedHoldOrder, setSelectedHoldOrder] = useState<DeskOrder | null>(null);
  const [releaseNote, setReleaseNote] = useState("Customer promised cash payment on van delivery");
  const [releasing, setReleasing] = useState(false);

  // Tally Export Modal State (Module 7)
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [loadingTallyPreview, setLoadingTallyPreview] = useState(false);
  const [tallyPreview, setTallyPreview] = useState<{
    count: number;
    orders: Array<{ id: string; retailerName: string; route?: string; grandTotal: number; itemsCount: number }>;
    xmlPreview: string;
    fullXml: string;
    isValidXml: boolean;
  } | null>(null);
  const [tallyExporting, setTallyExporting] = useState(false);
  const [copiedTallyXml, setCopiedTallyXml] = useState(false);
  const [tallySuccessBanner, setTallySuccessBanner] = useState<string | null>(null);

  // Module 8: Van Route Manifest State
  const [manifestData, setManifestData] = useState<{
    availableRoutes: string[];
    selectedRoute: string;
    manifest: any;
  } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>("Napier Town Route #4");
  const [loadingManifest, setLoadingManifest] = useState(false);

  // Module 9: 14-Day Dormant Retailers State
  const [dormantData, setDormantData] = useState<{
    totalRetailers: number;
    dormantCount: number;
    dormantRetailers: any[];
  } | null>(null);
  const [dormantDays, setDormantDays] = useState<number>(14);
  const [loadingDormant, setLoadingDormant] = useState(false);
  const [activeNudgeRetailer, setActiveNudgeRetailer] = useState<any | null>(null);

  // Master Clean Slate Reset State
  const [showCleanSlateModal, setShowCleanSlateModal] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);



  const handleCleanSlateReset = async (mode: "clean_slate" | "factory_demo") => {
    setResettingDb(true);
    try {
      const res = await fetch("/api/setup/reset-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCleanSlateModal(false);
        await fetchOrders();
      }
    } catch (err) {
      console.error("Clean slate reset error:", err);
    } finally {
      setResettingDb(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = new URL("/api/desk/orders", window.location.origin);
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter);
      if (searchQuery.trim()) url.searchParams.set("q", searchQuery.trim());

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to load orders");
      } else {
        setOrders(data.orders || []);
        setStats(data.stats || null);
      }
    } catch {
      setErrorMsg("Network error connecting to distributor server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCatalogue();
  }, [statusFilter]);

  const fetchManifest = async (route?: string) => {
    setLoadingManifest(true);
    try {
      const url = new URL("/api/desk/van-manifest", window.location.origin);
      if (route) url.searchParams.set("route", route);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setManifestData(data);
        if (data.selectedRoute) setSelectedRoute(data.selectedRoute);
      }
    } catch {
      console.error("Failed to load van manifest");
    } finally {
      setLoadingManifest(false);
    }
  };

  const fetchDormant = async (days = 14) => {
    setLoadingDormant(true);
    try {
      const url = new URL("/api/desk/dormant", window.location.origin);
      url.searchParams.set("days", days.toString());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setDormantData(data);
      }
    } catch {
      console.error("Failed to load dormant retailers");
    } finally {
      setLoadingDormant(false);
    }
  };

  useEffect(() => {
    if (activeTab === "VAN_MANIFEST") {
      fetchManifest(selectedRoute);
    } else if (activeTab === "DORMANT") {
      fetchDormant(dormantDays);
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleQuickReleaseHold = async () => {
    if (!selectedHoldOrder) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/desk/orders/${selectedHoldOrder.id}/release-hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedOccVersion: selectedHoldOrder.occVersion,
          authorizedBy: "Amit Jain (Central Desk)",
          approvalNote: releaseNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to release credit hold.");
      } else {
        setSelectedHoldOrder(null);
        fetchOrders();
      }
    } catch {
      alert("Network error releasing credit hold.");
    } finally {
      setReleasing(false);
    }
  };

  const handleOpenTallyModal = async () => {
    setShowTallyModal(true);
    setLoadingTallyPreview(true);
    setCopiedTallyXml(false);
    try {
      const res = await fetch("/api/tally/preview");
      const data = await res.json();
      if (data.success) {
        setTallyPreview(data);
      } else {
        alert(data.error || "Failed to load Tally preview.");
      }
    } catch {
      alert("Network error fetching Tally export preview.");
    } finally {
      setLoadingTallyPreview(false);
    }
  };

  const handleCopyTallyXml = () => {
    if (!tallyPreview?.fullXml) return;
    navigator.clipboard.writeText(tallyPreview.fullXml);
    setCopiedTallyXml(true);
    setTimeout(() => setCopiedTallyXml(false), 2500);
  };

  const handleDownloadTallyXml = async () => {
    setTallyExporting(true);
    try {
      const res = await fetch("/api/tally/export?download=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportAllVerified: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to export Tally batch.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.download = `tally-export-${today}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setTallySuccessBanner(`Successfully exported ${tallyPreview?.count || "batch"} orders to Tally XML!`);
      setShowTallyModal(false);
      fetchOrders();
    } catch {
      alert("Network error executing Tally export download.");
    } finally {
      setTallyExporting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const filteredSkus = catalogueSkus.filter((sku) => {
    const q = catalogueSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      sku.name.toLowerCase().includes(q) ||
      sku.brand.toLowerCase().includes(q) ||
      sku.code.toLowerCase().includes(q);
    const matchesCat =
      catalogueCategory === "ALL" ||
      sku.category.toLowerCase().includes(catalogueCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* 1. TOP COMMAND BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-xs">
              CA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-none">
                  Company A, Jabalpur
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  Order Desk
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Central Operations Terminal • ~600 Orders/Day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCleanSlateModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
              title="Reset Database to Clean Slate"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clean Slate</span>
            </button>

            <Link
              href="/setup"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>Catalog & Excel Hub</span>
            </Link>



            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Sunil Clerk
                </span>
                <span className="text-[10px] text-slate-500">Jabalpur Office</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. OPERATIONAL SUMMARY METRICS STRIP */}
      <section className="bg-white border-b border-slate-200 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Orders Today
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black text-slate-900 font-mono">
                  {stats?.totalOrders ?? "--"}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ₹{Math.round(stats?.totalWholesaleValue ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("PLACED")}
              className={`border rounded-lg p-2.5 cursor-pointer transition-colors ${
                statusFilter === "PLACED"
                  ? "bg-amber-100/60 border-amber-400"
                  : "bg-amber-50/50 border-amber-200 hover:bg-amber-100/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Needs Review
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-xl font-black text-amber-900 font-mono mt-1 block">
                {stats?.needsReviewCount ?? 0}
              </span>
            </div>

            <div
              onClick={() => setStatusFilter("CREDIT_HOLD")}
              className={`border rounded-lg p-2.5 cursor-pointer transition-colors ${
                statusFilter === "CREDIT_HOLD"
                  ? "bg-red-100/60 border-red-400"
                  : "bg-red-50/50 border-red-200 hover:bg-red-100/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
                  Credit Holds
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <span className="text-xl font-black text-red-900 font-mono mt-1 block">
                {stats?.creditHoldCount ?? 0}
              </span>
            </div>

            <div
              onClick={() => setStatusFilter("VERIFIED")}
              className={`border rounded-lg p-2.5 cursor-pointer transition-colors ${
                statusFilter === "VERIFIED"
                  ? "bg-emerald-100/60 border-emerald-400"
                  : "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Confirmed / Verified
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xl font-black text-emerald-900 font-mono mt-1 block">
                {stats?.verifiedCount ?? 0}
              </span>
            </div>

            <div
              onClick={() => setStatusFilter("EXPORTED_TALLY")}
              className={`border rounded-lg p-2.5 cursor-pointer transition-colors ${
                statusFilter === "EXPORTED_TALLY"
                  ? "bg-purple-100/60 border-purple-400"
                  : "bg-purple-50/50 border-purple-200 hover:bg-purple-100/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                  Tally Exported
                </span>
                <FileText className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-xl font-black text-purple-900 font-mono mt-1 block">
                {stats?.exportedCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WORKSPACE TABS */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("QUEUE")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "QUEUE"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Orders Queue ({stats?.totalOrders ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("CREDIT_HOLDS");
              setStatusFilter("CREDIT_HOLD");
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "CREDIT_HOLDS"
                ? "bg-red-700 text-white shadow-xs"
                : "text-red-700 hover:bg-red-100/60"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Credit Holds ({stats?.creditHoldCount ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("CATALOGUE");
              fetchCatalogue();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "CATALOGUE"
                ? "bg-emerald-800 text-white shadow-xs"
                : "text-emerald-800 hover:bg-emerald-100/60"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catalogue & Stock ({catalogueSkus.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("VAN_MANIFEST");
              fetchManifest();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "VAN_MANIFEST"
                ? "bg-blue-700 text-white shadow-xs"
                : "text-blue-700 hover:bg-blue-100/60"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Van Route Manifests</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("DORMANT");
              fetchDormant(dormantDays);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "DORMANT"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-100/60"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Dormant Kiranas (14+ Days)</span>
          </button>
        </div>

        {/* TAB 1 & 2: ORDERS QUEUE & CREDIT HOLDS */}
        {(activeTab === "QUEUE" || activeTab === "CREDIT_HOLDS") && (
          <>
            {/* 4. ORDERS FILTER & SEARCH TOOLBAR */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "ALL", label: "All Orders" },
                  { id: "PLACED", label: "Needs Review" },
                  { id: "CREDIT_HOLD", label: "Credit Holds" },
                  { id: "VERIFIED", label: "Confirmed" },
                  { id: "EXPORTED_TALLY", label: "Exported" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                      statusFilter === chip.id
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Order #, Kirana, Beat..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </form>
            </div>

            {/* 5. ORDERS QUEUE DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-700 mb-2" />
                  Loading distributor orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">All Clear! No orders in this queue.</h3>
                  <p className="text-xs text-slate-500">
                    No pending orders for this filter. Switch tabs to view other queues.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Retailer / Beat</th>
                        <th className="py-3 px-4">Source</th>
                        <th className="py-3 px-4">Items / Cases</th>
                        <th className="py-3 px-4 text-right">Invoice Total</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((ord) => {
                        const isCreditHold = ord.status === "CREDIT_HOLD";

                        return (
                          <tr
                            key={ord.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isCreditHold ? "bg-red-50/20" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {ord.id}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                v{ord.occVersion} • {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block leading-tight">
                                {ord.retailerName}
                              </span>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{ord.route || "General Beat"}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {ord.orderSource === "WHATSAPP_AI" && "📱 WhatsApp AI"}
                                {ord.orderSource === "PORTAL_CATALOGUE" && "🛒 Retailer App"}
                                {ord.orderSource === "SALESMAN_COUNTER" && "💼 Sales Counter"}
                                {!ord.orderSource && "📱 Direct Text"}
                              </span>
                              {ord.mediaUrl && (
                                <a
                                  href={ord.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 mt-0.5 hover:underline"
                                >
                                  {ord.mediaType === "audio" ? "🎙️ Voice Note" : "📸 Paper Slip"}
                                  <span>↗</span>
                                </a>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-medium text-slate-800">
                                {ord.totalItemsCount} items
                              </span>
                              <span className="text-slate-400 text-[11px] block">
                                {ord.totalCasesCount} total cases
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-900 text-sm block">
                                ₹{Math.round(ord.grandTotal).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10px] text-slate-400">Incl. GST</span>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {ord.status === "PLACED" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" />
                                  <span>Needs Review</span>
                                </span>
                              )}
                              {ord.status === "CREDIT_HOLD" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Credit Hold</span>
                                </span>
                              )}
                              {ord.status === "VERIFIED" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Confirmed</span>
                                </span>
                              )}
                              {ord.status === "EXPORTED_TALLY" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                  <FileText className="w-3 h-3" />
                                  <span>Exported (Tally)</span>
                                </span>
                              )}
                              {ord.status === "CANCELLED" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 line-through">
                                  Cancelled
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {isCreditHold && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHoldOrder(ord)}
                                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
                                  >
                                    Release Hold
                                  </button>
                                )}

                                <Link
                                  href={`/desk/orders/${ord.id}`}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center gap-1 transition-colors"
                                >
                                  <span>Verify</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 6. BATCH ACTIONS BAR (Module 7 Tally Export Integration) */}
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold leading-tight">
                      Tally ERP 9 / Prime Batch Export Ready
                    </h4>
                    <span className="text-[10px] font-mono uppercase bg-emerald-900/80 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded">
                      Rule [A21]
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {stats?.verifiedCount ?? 0} confirmed orders ready for double-entry XML voucher generation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenTallyModal}
                  disabled={(stats?.verifiedCount ?? 0) === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Preview & Export Tally XML ({stats?.verifiedCount ?? 0})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 3: WHOLESALE CATALOGUE & INVENTORY MANAGEMENT */}
        {activeTab === "CATALOGUE" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search product or brand..."
                    value={catalogueSearch}
                    onChange={(e) => setCatalogueSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-emerald-600 focus:bg-white"
                  />
                </div>

                <select
                  value={catalogueCategory}
                  onChange={(e) => setCatalogueCategory(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-600 shrink-0"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Biscuits">Biscuits</option>
                  <option value="Tea">Tea & Beverages</option>
                  <option value="Oils">Edible Oils & Ghee</option>
                  <option value="Laundry">Laundry & Detergents</option>
                  <option value="Personal">Personal Care</option>
                  <option value="Foods">Packaged Foods</option>
                  <option value="Home">Home Care</option>
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Product</span>
                </button>

                <Link
                  href="/setup"
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Excel Hub</span>
                </Link>
              </div>
            </div>

            {/* Inventory KPI Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Products</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{catalogueSkus.length}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Warehouse Stock</span>
                <span className="text-xl font-black text-emerald-800 font-mono mt-0.5 block">
                  {catalogueSkus.reduce((sum, s) => sum + (s.stockCases || 0), 0).toLocaleString("en-IN")} Cases
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Stock Value</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                  ₹{Math.round(catalogueSkus.reduce((sum, s) => sum + (s.stockCases || 0) * (s.dealerPrice || 0), 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Catalogue Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Product Name & Code</th>
                      <th className="py-2.5 px-3">Category / Pack</th>
                      <th className="py-2.5 px-3">Wholesale Price</th>
                      <th className="py-2.5 px-3">GST</th>
                      <th className="py-2.5 px-3">Trade Scheme</th>
                      <th className="py-2.5 px-3">Warehouse Stock</th>
                      <th className="py-2.5 px-3 text-right">Quick Stock Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSkus.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          {loadingCatalogue ? "Loading catalog..." : "No products found."}
                        </td>
                      </tr>
                    ) : (
                      filteredSkus.map((sku) => (
                        <tr key={sku.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block truncate max-w-[220px]" title={sku.name}>
                              {sku.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[200px]">
                              {sku.code || sku.id} • {sku.brand}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-slate-700 block truncate max-w-[140px]">{sku.category}</span>
                            <span className="text-[11px] text-slate-400 block">{sku.packSize} ({sku.unitsPerCase} cs)</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                            ₹{sku.dealerPrice.toLocaleString("en-IN")}
                            <span className="text-[10px] font-normal text-slate-400 block">₹{Math.round(sku.dealerPrice / (sku.unitsPerCase || 24))} / pack</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-600">
                            {sku.gstRate}%
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {sku.schemeType === "FREE_GOODS" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Buy 10 Get 1 Free
                              </span>
                            )}
                            {sku.schemeType === "FLAT_REBATE" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                                Flat Rebate
                              </span>
                            )}
                            {sku.schemeType === "SLAB_DISCOUNT" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Slab Discount
                              </span>
                            )}
                            {(!sku.schemeType || sku.schemeType === "NONE") && (
                              <span className="text-[10px] text-slate-400 font-semibold">Standard</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              sku.stockCases < 20 ? "bg-red-100 text-red-800" : "bg-emerald-50 text-emerald-800"
                            }`}>
                              {sku.stockCases} Cases
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={stockUpdatingSkuId === sku.id || sku.stockCases <= 0}
                                onClick={() => handleStockDelta(sku.id, -5)}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                title="Deduct 5 cases"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                disabled={stockUpdatingSkuId === sku.id}
                                onClick={() => handleStockDelta(sku.id, 10)}
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 disabled:opacity-40"
                                title="Add 10 cases"
                              >
                                +10 cs
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VAN LOADING ROUTE MANIFEST */}
        {activeTab === "VAN_MANIFEST" && (
          <div className="space-y-4">
            {/* Manifest Route Selector & Action Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Select Delivery Beat / Vehicle Route
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => {
                      setSelectedRoute(e.target.value);
                      fetchManifest(e.target.value);
                    }}
                    className="text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    {manifestData?.availableRoutes.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchManifest(selectedRoute)}
                  className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingManifest ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-9 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Loading Sheet</span>
                </button>
              </div>
            </div>

            {loadingManifest ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-700 mb-2" />
                Aggregating route picking list and stop sequence...
              </div>
            ) : !manifestData?.manifest ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
                No orders found for this route.
              </div>
            ) : (
              <>
                {/* Vehicle Telemetry Strip */}
                <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Van</span>
                    <span className="text-sm font-bold text-white mt-0.5 block font-mono">
                      {manifestData.manifest.vanNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Route Driver</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {manifestData.manifest.driverName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
                    <span className="text-sm font-black text-white mt-0.5 block font-mono">
                      {manifestData.manifest.totalOrders} Delivery Drops
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Cargo</span>
                    <span className="text-sm font-black text-emerald-400 mt-0.5 block font-mono">
                      {manifestData.manifest.totalMasterCases} Master Cases
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({manifestData.manifest.totalFreeCases} scheme free)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Cargo Weight</span>
                    <span className="text-sm font-black text-amber-400 mt-0.5 block font-mono">
                      ~{manifestData.manifest.approxTotalWeightKg} kg
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ₹{Math.round(manifestData.manifest.totalWholesaleValue).toLocaleString("en-IN")} Load
                    </span>
                  </div>
                </div>

                {/* SECTION 1: WAREHOUSE PICK LIST (AGGREGATED MASTER CASES BY SKU) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-blue-700" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        1. Warehouse Vehicle Pick List (Aggregated Master Cases)
                      </h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-mono">
                      Rule [A22] Pick Slip
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-4">SKU / Item Description</th>
                          <th className="py-2.5 px-4">Brand</th>
                          <th className="py-2.5 px-4 text-center">Pack Spec</th>
                          <th className="py-2.5 px-4 text-center">Billed Cases</th>
                          <th className="py-2.5 px-4 text-center">Free Scheme Cases</th>
                          <th className="py-2.5 px-4 text-center bg-blue-50/70 text-blue-900">Total Cases to Load</th>
                          <th className="py-2.5 px-4 text-right">Approx Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {manifestData.manifest.pickList.map((item: any) => (
                          <tr key={item.skuId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{item.skuName}</span>
                              <span className="font-mono text-[10px] text-slate-400">{item.skuCode}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{item.brand}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-600">
                              {item.unitsPerCase} pcs/case
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                              {item.paidCases} cs
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              {item.freeCases > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                  +{item.freeCases} FREE
                                </span>
                              ) : (
                                <span className="text-slate-400">--</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-black text-sm bg-blue-50/40 text-blue-950">
                              {item.totalCases} cases
                              <span className="block text-[10px] text-slate-500 font-normal">
                                ({item.totalPacks} packs)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              ~{item.approxWeightKg} kg
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 2: VAN DROP-OFF SEQUENCE */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        2. Van Drop-Off Stop Sequence & Driver Delivery Challans
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {manifestData.manifest.stops.length} Stops in Delivery Order
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {manifestData.manifest.stops.map((stop: any) => (
                      <div key={stop.orderId} className="p-4 hover:bg-slate-50/50 transition-colors space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              #{stop.stopNumber}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">{stop.retailerName}</h4>
                                <span className="text-xs text-slate-500">({stop.ownerName})</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    stop.paymentMode === "CREDIT"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {stop.paymentMode === "CREDIT" ? "Credit Approved" : "Cash on Delivery"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{stop.address}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <a
                              href={`tel:${stop.phone}`}
                              className="px-2.5 py-1 text-xs font-bold border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1"
                            >
                              <PhoneCall className="w-3 h-3 text-slate-500" />
                              <span>{stop.phone}</span>
                            </a>
                            <div className="text-right">
                              <span className="font-mono font-black text-sm text-slate-900 block">
                                ₹{Math.round(stop.grandTotal).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {stop.orderId} • {stop.totalCases} cases
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stop Line Items Pill Grid */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex flex-wrap gap-2 text-xs">
                          {stop.lines.map((ln: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] flex items-center gap-1.5"
                            >
                              <span className="font-medium text-slate-800">{ln.skuName}:</span>
                              <span className="font-mono font-bold text-slate-900">
                                {ln.paidCases} cs
                              </span>
                              {ln.freeCases > 0 && (
                                <span className="font-mono font-bold text-emerald-700">
                                  (+{ln.freeCases} free)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: 14-DAY DORMANT RETAILERS RETENTION DASHBOARD (MODULE 9) */}
        {activeTab === "DORMANT" && (
          <div className="space-y-4">
            {/* Retention Header & Filter Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      14-Day Dormant Retailers Retention Dashboard
                    </h3>
                    <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                      Rule [A23]
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kirana accounts with zero orders in ≥14 days. 1-tap WhatsApp re-order nudges with live promo schemes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Threshold:</span>
                {[14, 21, 28].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      setDormantDays(days);
                      fetchDormant(days);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      dormantDays === days
                        ? "bg-amber-800 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {days}+ Days
                  </button>
                ))}
              </div>
            </div>

            {/* Dormant Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Directory Kiranas
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                  {dormantData?.totalRetailers ?? "--"}
                </span>
                <span className="text-[10px] text-slate-400">Jabalpur Network</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                  Dormant ({dormantDays}+ Days)
                </span>
                <span className="text-2xl font-black text-amber-900 font-mono mt-1 block">
                  {dormantData?.dormantCount ?? 0}
                </span>
                <span className="text-[10px] text-amber-700 font-bold">Churn Risk Accounts</span>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-bold text-red-900 uppercase tracking-wider block">
                  Critical Churn (≥21 Days)
                </span>
                <span className="text-2xl font-black text-red-900 font-mono mt-1 block">
                  {dormantData?.dormantRetailers.filter((r) => r.churnRisk === "CRITICAL").length ?? 0}
                </span>
                <span className="text-[10px] text-red-700 font-bold">Urgent Sales Beat Visit</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  At-Risk Monthly Volume
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                  ₹
                  {dormantData?.dormantRetailers
                    .reduce((acc, r) => acc + (r.avgOrderValue || 0), 0)
                    .toLocaleString("en-IN") ?? "0"}
                </span>
                <span className="text-[10px] text-slate-400">Estimated Turnover</span>
              </div>
            </div>

            {/* Dormant Retailers Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Kirana Shop / Owner</th>
                      <th className="py-3 px-4">Route / Beat</th>
                      <th className="py-3 px-4 text-center">Inactivity</th>
                      <th className="py-3 px-4 text-right">Available Credit</th>
                      <th className="py-3 px-4 text-right">Avg Order Value</th>
                      <th className="py-3 px-4 text-center">Churn Risk</th>
                      <th className="py-3 px-4 text-right">Retention Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dormantData?.dormantRetailers.map((ret: any) => (
                      <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block text-sm">{ret.name}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>{ret.ownerName}</span>
                            <span>•</span>
                            <span className="font-mono">{ret.phone}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="font-medium text-slate-800 block">{ret.route}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px] block">
                            {ret.address}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-amber-900 text-sm block">
                            {ret.daysInactive} days
                          </span>
                          <span className="text-[10px] text-slate-400">no order</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-bold text-emerald-800 block">
                            ₹{ret.availableCredit.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            of ₹{ret.creditLimit.toLocaleString("en-IN")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-bold text-slate-900 block">
                            ₹{ret.avgOrderValue.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-400">per order avg</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {ret.churnRisk === "CRITICAL" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3" />
                              <span>CRITICAL</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <span>HIGH RISK</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`tel:${ret.phone}`}
                              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1 transition-colors"
                              title="Call Retailer"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                              <span>Call</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => setActiveNudgeRetailer(ret)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp Nudge</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* WHATSAPP NUDGE MODAL */}
            {activeNudgeRetailer && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        WA
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          1-Tap WhatsApp Re-Order Nudge
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Personalized Hindi promo message with live trade schemes.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveNudgeRetailer(null)}
                      className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950">{activeNudgeRetailer.name}</span>
                      <span className="font-mono text-emerald-800 font-bold">+91 {activeNudgeRetailer.phone}</span>
                    </div>
                    <p className="text-emerald-800 text-[11px]">
                      Inactive: <strong>{activeNudgeRetailer.daysInactive} days</strong> • Route: {activeNudgeRetailer.route}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Message Content (Devanagari Hindi):
                    </label>
                    <textarea
                      readOnly
                      rows={4}
                      value={activeNudgeRetailer.activePromoTextHindi}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-normal leading-relaxed focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveNudgeRetailer(null)}
                      className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <a
                      href={activeNudgeRetailer.whatsappDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setActiveNudgeRetailer(null)}
                      className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Launch WhatsApp Chat</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* SUCCESS NOTIFICATION TOAST */}
      {tallySuccessBanner && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-emerald-100 border border-emerald-700 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-white">{tallySuccessBanner}</p>
            <p className="text-[11px] text-emerald-300">
              Import file into Tally via: Alt+O → Import → Transactions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTallySuccessBanner(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 text-sm leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* TALLY EXPORT MODAL (MODULE 7) */}
      {showTallyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Tally ERP 9 / TallyPrime Batch Export
                    </h3>
                    <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      Sales Vouchers
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Generates balanced XML with Actual vs Billed Qty schemes & 50/50 MP GST ledgers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTallyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {loadingTallyPreview ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700 mb-2" />
                Constructing Tally XML envelope and ledger allocations...
              </div>
            ) : !tallyPreview || tallyPreview.orders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-700">No Confirmed Orders to Export</p>
                <p className="text-[11px]">
                  Orders must be reviewed and marked Confirmed (VERIFIED) before generating Tally vouchers.
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {/* Orders to be exported summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Orders Included in this Batch ({tallyPreview.orders.length})
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {tallyPreview.orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="flex items-center justify-between text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                          <span className="text-slate-600 truncate max-w-[200px]">{ord.retailerName}</span>
                          <span className="text-[10px] text-slate-400">({ord.route || "General Beat"})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">{ord.itemsCount} items</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{Math.round(ord.grandTotal).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accounting Specs Badge Strip */}
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                    <span className="font-bold text-emerald-900 block">Double-Entry Rules</span>
                    <span className="text-emerald-700 text-[10px]">Debit Party (+) / Credit Sales & GST (-)</span>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded p-2">
                    <span className="font-bold text-purple-900 block">Trade Schemes [A11]</span>
                    <span className="text-purple-700 text-[10px]">ActualQty vs BilledQty (Zero phantom sales)</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <span className="font-bold text-blue-900 block">MP Intra-State GST</span>
                    <span className="text-blue-700 text-[10px]">50/50 Output CGST + Output SGST</span>
                  </div>
                </div>

                {/* XML Preview Window */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      XML Payload Preview ({tallyPreview.isValidXml ? "Valid XML ✓" : "Invalid XML ⚠️"})
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyTallyXml}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedTallyXml ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Raw XML</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-emerald-400 p-3 rounded-lg text-[10px] font-mono leading-tight max-h-40 overflow-y-auto whitespace-pre selection:bg-emerald-800 selection:text-white">
                    {tallyPreview.xmlPreview}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Exports will update orders to <strong>Exported (Tally)</strong>.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTallyModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTallyXml}
                  disabled={tallyExporting || !tallyPreview || tallyPreview.orders.length === 0}
                  className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {tallyExporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Exporting Batch...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Tally XML Batch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. CREDIT HOLD RELEASE MODAL */}
      {selectedHoldOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Release Credit Hold (#{selectedHoldOrder.id})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHoldOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-950 space-y-1">
              <span className="font-bold block text-red-900">
                Kirana: {selectedHoldOrder.retailerName}
              </span>
              <p className="text-red-800 text-[11px]">
                {selectedHoldOrder.creditHoldReason || "Order exceeds approved credit headroom."}
              </p>
              <div className="font-mono text-xs font-bold pt-1 text-slate-800">
                Order Value: ₹{Math.round(selectedHoldOrder.grandTotal).toLocaleString("en-IN")}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Office Authorization Note / Justification:
              </label>
              <input
                type="text"
                value={releaseNote}
                onChange={(e) => setReleaseNote(e.target.value)}
                placeholder="e.g. Cash payment on delivery promised"
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              <span className="text-[10px] text-slate-500 block">
                Recorded in audit logs as approved by Sunil Clerk (Central Desk).
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedHoldOrder(null)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickReleaseHold}
                disabled={releasing}
                className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {releasing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Releasing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Verify Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER CLEAN SLATE RESET MODAL */}
      {showCleanSlateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Wipe Database to Clean Slate
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reset the order queue and warehouse inventory to start clean demonstrations.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
                <strong className="block text-red-950 font-bold mb-1">
                  🧹 Clean Slate (Zero Orders)
                </strong>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  Clears all incoming orders, cancels holds, resets credit exposures to baseline, and restores physical inventory (340 biscuit, 85 detergent, 0 tea).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={resettingDb}
                onClick={() => setShowCleanSlateModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingDb}
                onClick={() => handleCleanSlateReset("clean_slate")}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                {resettingDb ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Yes, Wipe to Clean Slate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Desk Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductAdded={async (newSku) => {
          setCatalogueSkus((prev) => [newSku, ...prev]);
          await fetchCatalogue();
        }}
      />
    </div>
  );
}
