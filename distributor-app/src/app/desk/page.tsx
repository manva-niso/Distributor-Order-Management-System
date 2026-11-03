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
} from "lucide-react";

interface DeskOrder {
  id: string;
  retailerId: string;
  retailerName: string;
  route?: string;
  retailerPhone?: string;
  placedBy: string;
  orderSource?: string;
  rawUtterance?: string;
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

type TabType = "QUEUE" | "CREDIT_HOLDS" | "VAN_MANIFEST" | "DORMANT";

export default function OrderDeskPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("QUEUE");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
  }, [statusFilter]);

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
            <Link
              href="/setup"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>Catalog & Excel Hub</span>
            </Link>

            <Link
              href="/quick-order"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>+ Quick Ingest</span>
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
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
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
            onClick={() => alert("Module 8: Van Loading Route Manifest will open in the next step!")}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Van Route Manifests (Module 8)</span>
          </button>

          <button
            type="button"
            onClick={() => alert("Module 9: 14-Day Dormant Retailers Dashboard will open in the next step!")}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>14-Day Dormant Kiranas (Module 9)</span>
          </button>
        </div>

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
                Switch filters or capture new orders via Quick Ingest.
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
                    const isNeedsReview = ord.status === "PLACED";

                    return (
                      <tr
                        key={ord.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCreditHold ? "bg-red-50/20" : ""
                        }`}
                      >
                        {/* Order ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {ord.id}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            v{ord.occVersion} • {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>

                        {/* Retailer & Route */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block leading-tight">
                            {ord.retailerName}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{ord.route || "General Beat"}</span>
                          </span>
                        </td>

                        {/* Source */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {ord.orderSource === "WHATSAPP_AI" && "📱 WhatsApp AI"}
                            {ord.orderSource === "PORTAL_CATALOGUE" && "🛒 Retailer App"}
                            {ord.orderSource === "SALESMAN_COUNTER" && "💼 Sales Counter"}
                            {!ord.orderSource && "📱 Direct Text"}
                          </span>
                        </td>

                        {/* Items / Cases */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-800">
                            {ord.totalItemsCount} items
                          </span>
                          <span className="text-slate-400 text-[11px] block">
                            {ord.totalCasesCount} total cases
                          </span>
                        </td>

                        {/* Invoice Total */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            ₹{Math.round(ord.grandTotal).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-400">Incl. GST</span>
                        </td>

                        {/* Status Badge */}
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

                        {/* Actions */}
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
    </div>
  );
}
