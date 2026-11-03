"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Phone,
  User,
  MapPin,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Building2,
  FileText,
} from "lucide-react";
import { AVAILABLE_ROUTES } from "@/app/api/auth/register/route";

type Language = "en" | "hi";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lang, setLang] = useState<Language>("en");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [route, setRoute] = useState(AVAILABLE_ROUTES[0]);
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const queryPhone = searchParams.get("phone");
    if (queryPhone) {
      setPhone(queryPhone.replace(/\D/g, "").slice(-10));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMsg(
        lang === "hi"
          ? "कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।"
          : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!shopName.trim() || !ownerName.trim() || !address.trim()) {
      setErrorMsg(
        lang === "hi"
          ? "कृपया दुकान का नाम, मालिक का नाम और पता भरें।"
          : "Please fill in Shop Name, Owner Name, and Address."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          route,
          address: address.trim(),
          gstin: gstin.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Registration failed. Please check details.");
        setLoading(false);
        return;
      }

      setSuccessMsg(
        lang === "hi"
          ? "दुकान सफलतापूर्वक पंजीकृत हो गई! कैटलॉग खोला जा रहा है..."
          : "Kirana registered successfully! Opening wholesale catalogue..."
      );

      setTimeout(() => {
        router.push(data.redirectUrl || "/catalogue");
      }, 1000);
    } catch {
      setErrorMsg("Network error during registration. Please check connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
            CA
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Company A • Jabalpur
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              FMCG & Home Care Wholesale
            </p>
          </div>
        </div>

        {/* Hindi / English Toggle */}
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="h-9 px-3 text-xs font-bold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span className={lang === "hi" ? "text-emerald-700" : "text-slate-400"}>
            अ/A
          </span>
          <span>{lang === "en" ? "हिंदी" : "English"}</span>
        </button>
      </header>

      {/* Main Registration Card */}
      <main className="max-w-md w-full mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {lang === "hi" ? "नई किराना दुकान जोड़ें" : "New Kirana Registration"}
            </h2>
            <p className="text-xs text-slate-600">
              {lang === "hi"
                ? "कंपनी ए वितरक नेटवर्क से सीधे माल मंगाएं"
                : "Register to order FMCG goods directly from Company A"}
            </p>
          </div>
        </div>

        {/* Provisional Credit Policy Card */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3.5 mb-5 flex items-start gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {lang === "hi" ? "₹25,000 आरंभिक क्रेडिट सीमा: " : "₹25,000 Provisional Credit: "}
            </span>
            {lang === "hi"
              ? "पंजीकरण के बाद आप तुरंत ऑर्डर कर सकते हैं। डिलीवरी वैन आपके रूट पर प्रतिदिन माल पहुंचाती है।"
              : "New kirana stores receive a ₹25,000 credit limit for orders. Van dispatch delivers directly on your route."}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3.5 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3.5 mb-4 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Shop Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "hi" ? "दुकान / स्टोर का नाम *" : "Shop / Store Name *"}
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={lang === "hi" ? "उदा: शर्मा किराना भंडार" : "e.g. Mahavir Daily Needs"}
                className="w-full h-11 pl-10 pr-3 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
              />
            </div>
          </div>

          {/* Owner Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "hi" ? "मालिक का नाम *" : "Proprietor / Owner Name *"}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder={lang === "hi" ? "उदा: राजेश कुमार" : "e.g. Rajesh Kumar"}
                className="w-full h-11 pl-10 pr-3 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
              />
            </div>
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "hi" ? "मोबाइल नंबर (10 अंक) *" : "Mobile Phone (10 digits) *"}
            </label>
            <div className="flex h-11 rounded-lg border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-700 focus-within:bg-white">
              <div className="flex items-center gap-1.5 px-3 bg-slate-200/80 text-slate-700 font-semibold text-sm border-r border-slate-300">
                <Phone className="w-4 h-4 text-slate-600" />
                <span>+91</span>
              </div>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98260XXXXX"
                className="w-full px-3 text-sm font-medium text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Beat / Delivery Route */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "hi" ? "डिलीवरी रूट / बीट *" : "Assigned Delivery Beat / Route *"}
            </label>
            <div className="relative">
              <Truck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full h-11 pl-10 pr-8 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white appearance-none cursor-pointer"
              >
                {AVAILABLE_ROUTES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shop Physical Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "hi" ? "दुकान का पूरा पता (जबलपुर) *" : "Store Address (Jabalpur) *"}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={lang === "hi" ? "उदा: दुकान 8, मुख्य बाज़ार, गोरखपुर" : "e.g. Shop 8, Main Market, Gorakhpur"}
                className="w-full h-11 pl-10 pr-3 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
              />
            </div>
          </div>

          {/* GSTIN (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>{lang === "hi" ? "जीएसटी नंबर (वैकल्पिक)" : "GSTIN (Optional)"}</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {lang === "hi" ? "छोटे किराना के लिए छूट" : "Composite / Exempt"}
              </span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="23AAAAA0000A1Z5"
                className="w-full h-11 pl-10 pr-3 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
              />
            </div>
          </div>

          {/* Submit Button (48px Touch Target) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{lang === "hi" ? "पंजीकरण किया जा रहा है..." : "Registering Account..."}</span>
              </>
            ) : (
              <>
                <span>{lang === "hi" ? "दुकान रजिस्टर करें और कैटलॉग देखें" : "Complete Registration & Order"}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Existing account link */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          <span>{lang === "hi" ? "पहले से पंजीकृत हैं? " : "Already an authorized partner? "}</span>
          <Link
            href="/login"
            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            {lang === "hi" ? "लॉगिन करें" : "Log In via OTP"}
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center pt-4 text-[11px] text-slate-500">
        Company A • Jabalpur Authorized B2B FMCG Distribution Network
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading registration...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
