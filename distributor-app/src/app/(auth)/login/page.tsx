"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Phone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Building2,
  UserCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

type Language = "en" | "hi";

interface BusinessHint {
  found: boolean;
  role?: string;
  title?: string;
  subtitle?: string;
  availableCredit?: number;
}

export default function LoginPage() {
  const router = useRouter();

  // Language state (English / Hindi)
  const [lang, setLang] = useState<Language>("en");

  // Form states
  const [phone, setPhone] = useState("9826000001"); // Pre-filled with Sharma Kirana for fast review
  const [businessHint, setBusinessHint] = useState<BusinessHint | null>(null);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Check business identity when phone changes
  useEffect(() => {
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (clean.length === 10) {
      fetch(`/api/auth/lookup-phone?phone=${clean}`)
        .then((res) => res.json())
        .then((data) => setBusinessHint(data))
        .catch(() => setBusinessHint(null));
    } else {
      setBusinessHint(null);
    }
  }, [phone]);

  // Resend timer countdown
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // Handle Quick Role demo clicks
  const selectQuickRole = (num: string) => {
    setPhone(num);
    setStep("phone");
    setErrorMsg(null);
    setSuccessMsg(null);
    setOtpDigits(["", "", "", "", "", ""]);
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = phone.replace(/\D/g, "").slice(-10);
    if (clean.length !== 10) {
      setErrorMsg(
        lang === "hi"
          ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।"
          : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to dispatch OTP");
        return;
      }

      setStep("otp");
      setTimerSeconds(45);
      setSuccessMsg(data.message);
      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
      }

      // Auto focus on first digit box after transition
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch {
      setErrorMsg("Network error. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP digit input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto advance
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation in OTP grid
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle paste in OTP inputs
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setErrorMsg(
        lang === "hi"
          ? "कृपया 6 अंकों का पूरा ओटीपी दर्ज करें।"
          : "Please enter the complete 6-digit OTP code."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, "").slice(-10),
          otp: otpCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Verification failed");
        return;
      }

      setSuccessMsg(
        lang === "hi"
          ? "सत्यापन सफल! पोर्टल में प्रवेश हो रहा है..."
          : "Verified successfully! Redirecting to workspace..."
      );

      // Navigate to authorized dashboard
      router.push(data.redirectUrl || "/catalogue");
    } catch {
      setErrorMsg("Network error during verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans antialiased">
      {/* Top Bar: Distributor Identity & Bilingual Switch */}
      <header className="w-full bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm leading-tight">Company A</span>
              <span className="text-xs text-slate-500 font-medium">Jabalpur Wholesale Hub</span>
            </div>
          </div>

          {/* Language Toggle (48px Ergonomic Hit Area) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`h-8 px-2.5 rounded text-xs font-bold transition-all ${
                lang === "en" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`h-8 px-2.5 rounded text-xs font-bold transition-all ${
                lang === "hi" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Workspace (Centered Mobile Container) */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center gap-4">
        {/* Portal Greeting */}
        <div className="text-center pt-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "hi" ? "थोक व्यापारी लॉगिन" : "B2B Trade Login"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {lang === "hi"
              ? "दैनिक आर्डर, लाइव स्टॉक और थोक स्कीम हेतु अधिकृत पोर्टल"
              : "Direct wholesale ordering with live stock & dealer pricing"}
          </p>
        </div>

        {/* Testing / Demo Quick-Select Role Badges */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>{lang === "hi" ? "त्वरित खाता चयन (डेमो)" : "Quick Test Accounts"}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectQuickRole("9826000001")}
              className={`p-2 rounded-lg text-left border text-xs font-semibold transition-all ${
                phone.includes("00001")
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <Store className="w-3 h-3 text-emerald-700" /> Retailer
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">...00001</div>
            </button>

            <button
              type="button"
              onClick={() => selectQuickRole("9826000099")}
              className={`p-2 rounded-lg text-left border text-xs font-semibold transition-all ${
                phone.includes("00099")
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-700" /> Order Desk
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">...00099</div>
            </button>

            <button
              type="button"
              onClick={() => selectQuickRole("9826000018")}
              className={`p-2 rounded-lg text-left border text-xs font-semibold transition-all ${
                phone.includes("00018")
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-700" /> Salesman
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">...00018</div>
            </button>
          </div>
        </div>

        {/* Authentication Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          {/* STEP 1: Phone Entry */}
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label htmlFor="phoneInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {lang === "hi" ? "पंजीकृत मोबाइल नंबर" : "Registered Mobile Number"}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-slate-500 pointer-events-none text-sm font-semibold">
                    <Phone className="w-4 h-4 text-emerald-700" />
                    <span>+91</span>
                    <span className="w-px h-4 bg-slate-300"></span>
                  </div>
                  <input
                    id="phoneInput"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98260 00001"
                    maxLength={11}
                    className="w-full h-12 pl-20 pr-4 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Dynamic Business / Store Card */}
              {businessHint && businessHint.found && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-emerald-900 uppercase">
                      {lang === "hi" ? "सत्यापित खाता" : "Verified B2B Account"}
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate">{businessHint.title}</div>
                    <div className="text-xs text-slate-600">{businessHint.subtitle}</div>
                    {businessHint.availableCredit !== undefined && (
                      <div className="text-xs text-emerald-800 font-semibold mt-1">
                        {lang === "hi" ? "उपलब्ध उधार सीमा: " : "Available Credit: "}
                        ₹{businessHint.availableCredit.toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unregistered Phone Banner */}
              {businessHint && !businessHint.found && phone.replace(/\D/g, "").slice(-10).length === 10 && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-amber-900 uppercase">
                      {lang === "hi" ? "अपरिचित मोबाइल नंबर" : "Unregistered Mobile Number"}
                    </div>
                    <div className="text-xs text-amber-800 mt-0.5">
                      {lang === "hi"
                        ? "यह नंबर किसी मौजूदा वितरक खाते से नहीं जुड़ा है।"
                        : "This number is not yet linked to an authorized kirana account."}
                    </div>
                    <Link
                      href={`/register?phone=${phone.replace(/\D/g, "").slice(-10)}`}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 rounded px-2.5 py-1.5 shadow-xs hover:bg-emerald-50"
                    >
                      <Store className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{lang === "hi" ? "नई किराना दुकान पंजीकृत करें →" : "Register New Kirana Shop →"}</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Primary Action Button (48px Touch Target) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{lang === "hi" ? "ओटीपी भेजा जा रहा है..." : "Sending OTP..."}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === "hi" ? "ओटीपी प्राप्त करें" : "Send Login OTP"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: 6-Digit OTP Verification */
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {lang === "hi" ? "6-अंकों का ओटीपी दर्ज करें" : "Enter 6-Digit OTP"}
                  </span>
                  <span className="text-xs text-slate-500">
                    +91 {phone.replace(/\D/g, "").slice(-10)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  {lang === "hi" ? "नंबर बदलें" : "Change Phone"}
                </button>
              </div>

              {/* Dev Helper Callout */}
              {devOtpCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Dev Sandbox Notice: </span>
                    Your verification code is <strong className="font-mono text-sm bg-amber-200 px-1.5 py-0.5 rounded">{devOtpCode}</strong>
                  </div>
                </div>
              )}

              {/* 6-Digit Input Grid */}
              <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-full h-12 text-center text-xl font-bold font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
                  />
                ))}
              </div>

              {/* Resend Timer & Action */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                {timerSeconds > 0 ? (
                  <span>
                    {lang === "hi" ? "पुनः भेजने का समय: " : "Resend SMS in "}
                    <strong className="font-mono text-emerald-800">
                      00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                    </strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {lang === "hi" ? "नया ओटीपी भेजें" : "Resend OTP Now"}
                  </button>
                )}
              </div>

              {/* Verify & Login Button (48px Touch Target) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{lang === "hi" ? "सत्यापित हो रहा है..." : "Verifying..."}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>{lang === "hi" ? "सत्यापित कर लॉगिन करें" : "Verify & Login"}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Feedback Notices */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && !errorMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* New Kirana Registration Link */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>{lang === "hi" ? "नया किराना स्टोर?" : "New Kirana Store?"}</span>
            <Link
              href="/register"
              className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
            >
              <Store className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "नई दुकान पंजीकृत करें" : "Register Store"}</span>
            </Link>
          </div>
        </div>

        {/* Security & Regulatory Footer Note */}
        <div className="text-center text-xs text-slate-500">
          <span>Company A Wholesale • Jabalpur (MP) • Rule 46 CGST Compliant</span>
        </div>
      </main>

      {/* Persistent Bottom Status Strip */}
      <footer className="w-full bg-slate-100 border-t border-slate-200 py-2.5 px-4 text-center text-xs text-slate-500">
        <span>Helpline: 1800-419-0021 • Support: 0761-248000</span>
      </footer>
    </div>
  );
}
