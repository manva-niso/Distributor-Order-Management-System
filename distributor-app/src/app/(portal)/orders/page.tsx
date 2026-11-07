"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Truck,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Gift,
  LogOut,
} from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import { getCartStorageKey, saveScopedCart } from "@/lib/catalogue/cart-storage";
import { TRADE_DICT, getSkuDisplay, ROUTE_HINDI_MAP, RETAILER_NAME_FALLBACK_MAP, Language } from "@/lib/i18n/trade-dict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface OrderLine {
  id: string;
  skuId?: string;
  skuName?: string;
  skuCode?: string;
  quantityCases: number;
  quantityPacks?: number;
  freeCases: number;
  unitDealerPrice: number;
  netLineAmount: number;
  gstRate: number;
}

interface OrderRecord {
  id: string;
  retailerId?: string;
  retailerName: string;
  retailerNameHi?: string;
  retailerRoute: string;
  retailerRouteHi?: string;
  status: "PLACED" | "VERIFIED" | "CREDIT_HOLD" | "EXPORTED_TALLY" | "CANCELLED";
  grandTotal: number;
  totalGst: number;
  freeGoodsTally?: Array<{ skuId: string; skuName: string; freeCases: number }>;
  occVersion: number;
  createdAt: string;
  items: OrderLine[];
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placedOrderId = searchParams.get("placed");

  const { lang, setLang } = useLanguage();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.orders) {
          setOrders(data.orders);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleRepeatOrder = (order: OrderRecord) => {
    try {
      const draftCart: Record<string, { cases: number; packs: number }> = {};
      for (const it of order.items) {
        if (it.skuId) {
          draftCart[it.skuId] = {
            cases: it.quantityCases || 0,
            packs: it.quantityPacks || 0,
          };
        }
      }
      saveScopedCart(draftCart, order.retailerId);
      window.location.href = "/cart";
    } catch (err) {
      console.error("Repeat order error:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const t = TRADE_DICT[lang];

  const getStatusBadge = (status: OrderRecord["status"] | string) => {
    switch (status) {
      case "PLACED":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.statusPlaced}</span>
          </span>
        );
      case "CREDIT_HOLD":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span>{t.statusCreditHold}</span>
          </span>
        );
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3.5 h-3.5 text-blue-700" />
            <span>{t.statusVerified}</span>
          </span>
        );
      case "EXPORTED_TALLY":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <FileText className="w-3.5 h-3.5 text-purple-700" />
            <span>{t.statusTallyExported}</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <span>{t.statusCancelled}</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans antialiased">
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl min-h-screen bg-white flex flex-col md:shadow-xl md:border-x md:border-slate-200/80 pb-28 relative">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {lang === "hi" ? "पुराने आर्डर व स्थिति" : "Order History & Status"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {lang === "hi" ? "कंपनी ए • जबलपुर थोक वितरण बही" : "Company A • Jabalpur Distribution Beat"}
            </p>
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
        {/* Newly Placed Order Celebratory Toast */}
        {placedOrderId && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">
                {lang === "hi"
                  ? `ऑर्डर #${placedOrderId} सफलतापूर्वक दर्ज हुआ!`
                  : `Order #${placedOrderId} Placed Successfully!`}
              </h2>
              <p className="text-xs text-emerald-800 mt-0.5">
                {lang === "hi"
                  ? "सामान की पेकिंग और कल सुबह 9:30 बजे वैन डिलीवरी हेतु ऑर्डर लिस्ट में जोड़ दिया गया है।"
                  : "Items are batched for warehouse case picking and next morning van beat delivery."}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
            <span className="text-xs font-medium">Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-sm my-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === "hi" ? "कोई पिछला ऑर्डर नहीं मिला" : "No orders found"}
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                {lang === "hi"
                  ? "आपने अभी तक कोई ऑर्डर नहीं दिया है। ऑर्डर करने के लिए कैटलॉग पर जाएं।"
                  : "You haven't placed any wholesale orders yet. Visit the catalogue to start your booking."}
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
          /* Order Cards List */
          <div className="space-y-3">
            {orders.map((ord) => {
              const totalCases = ord.items.reduce((acc, it) => acc + it.quantityCases, 0);
              const totalFree = ord.items.reduce((acc, it) => acc + it.freeCases, 0);

              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  {/* Top Bar: Order ID + Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          #{ord.id}
                        </span>
                        {getStatusBadge(ord.status)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-slate-400" />
                          <span>
                            {lang === "hi"
                              ? ord.retailerRouteHi || ROUTE_HINDI_MAP[ord.retailerRoute] || ord.retailerRoute
                              : ord.retailerRoute}
                          </span>
                        </span>
                        <span>•</span>
                        <span>{new Date(ord.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-bold font-mono text-emerald-800 block">
                        ₹{Math.round(ord.grandTotal).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {totalCases} {lang === "hi" ? "पेटी" : "cases"} {totalFree > 0 && `(+${totalFree} ${lang === "hi" ? "मुफ्त" : "free"})`}
                      </span>
                    </div>
                  </div>

                  {/* Free Goods Alert if present */}
                  {ord.freeGoodsTally && ord.freeGoodsTally.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5 text-xs text-emerald-900 flex items-center gap-1.5 font-medium">
                      <Gift className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        {lang === "hi" ? "मुफ्त योजना पेटी: " : "Promotional Schemes: "}
                        {ord.freeGoodsTally.map((f) => `+${f.freeCases} ${getSkuDisplay({ name: f.skuName, id: f.skuId }, lang).name}`).join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Itemized Lines */}
                  <div className="space-y-1.5 pt-0.5">
                    {ord.items.map((it) => {
                      const skuDisplay = getSkuDisplay({ name: it.skuName || "", code: it.skuCode, id: it.skuId }, lang);
                      return (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-xs text-slate-700"
                        >
                          <span className="truncate pr-2">
                            <strong className="font-mono text-slate-900">
                              {it.quantityCases > 0 ? `${it.quantityCases} ${lang === "hi" ? "पेटी" : "Case(s)"}` : ""}
                              {it.quantityCases > 0 && (it.quantityPacks || 0) > 0 ? " + " : ""}
                              {(it.quantityPacks || 0) > 0 ? `${it.quantityPacks} ${lang === "hi" ? "पैकेट" : "Pack(s)"}` : ""}
                            </strong>{" "}
                            {skuDisplay.name || it.skuName || it.skuId}
                            {it.freeCases > 0 && (
                              <span className="text-emerald-700 font-semibold ml-1">
                                (+{it.freeCases} {lang === "hi" ? "मुफ्त" : "free"})
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-slate-900 shrink-0 font-medium">
                            ₹{it.netLineAmount.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Repeat Order Action Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {lang === "hi" ? "त्वरित पुनः ऑर्डर (1-टैप):" : "One-Tap Reorder:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRepeatOrder(ord)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{lang === "hi" ? "ऑर्डर दोहराएं (Repeat Order)" : "Repeat Order"}</span>
                    </button>
                  </div>

                  {/* Delivery Schedule Footer */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {lang === "hi"
                          ? "डिलीवरी: कल सुबह 9:30 AM (वैन बीट)"
                          : "Scheduled Delivery: 9:30 AM Next Morning (Van Beat)"}
                      </span>
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      OCC v{ord.occVersion}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Persistent Bottom Nav */}
      <BottomNav activeTab="orders" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
