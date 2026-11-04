"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Minimize2,
  Maximize2,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";

interface StepData {
  stepNumber: number;
  title: string;
  targetRoute: string;
  targetLabel: string;
  summary: string;
  points: string[];
  expandDetails: {
    whyItMatters: string;
    whatToObserve: string;
  };
}

const STEPS: StepData[] = [
  {
    stepNumber: 1,
    title: "Onboard Products & Retailers",
    targetRoute: "/setup",
    targetLabel: "Go to Setup Hub",
    summary: "Seed the clean slate database from scratch with zero hardcoded reliance.",
    points: [
      "Open the Master Setup Hub (/setup) with a completely empty database.",
      "Notice the live telemetry counters are at 0 SKUs, 0 Shops, and 0 Orders.",
      "Drag & drop master_distributor_template_dummy.xlsx or tap 'Load 12 Jabalpur SKUs & 8 Retailers'.",
      "Observe 10 FMCG SKUs, HSN codes, 50/50 GST rates, and 4 trade schemes auto-ingested.",
      "Watch the warehouse inventory strip jump to active wholesale telemetry!",
    ],
    expandDetails: {
      whyItMatters:
        "Proves the platform is not locked to hardcoded data. Any FMCG distributor can upload their arbitrary Excel price list and customer directory without changing code.",
      whatToObserve:
        "Instant telemetry update from 0 to 12 SKUs, 8 Kirana accounts, and warehouse inventory valuation.",
    },
  },
  {
    stepNumber: 2,
    title: "Verify Order Desk Zero-State",
    targetRoute: "/desk",
    targetLabel: "Go to Order Desk",
    summary: "Check the distributor dispatch desk before any retail orders arrive.",
    points: [
      "Navigate to the distributor Order Desk (/desk).",
      "Observe the pristine dispatch queue with exactly 0 Pending Orders.",
      "Inspect the live summary cards: Gross Value, Taxable Amount, and Active Holds at zero.",
      "Click the 'Dormant Retailers (14+ Days)' tab to see automated churn risk flags.",
      "Ready to accept fresh omnichannel orders from the Jabalpur retail network!",
    ],
    expandDetails: {
      whyItMatters:
        "Validates clean queue operations and multi-tenant ledger isolation before business hours begin.",
      whatToObserve:
        "Zero-state illustration and live dormant shop monitor highlighting shops requiring salesman visits.",
    },
  },
  {
    stepNumber: 3,
    title: "Retailer OTP Authentication",
    targetRoute: "/login",
    targetLabel: "Go to Login",
    summary: "Log in as a Jabalpur Kirana merchant without complicated passwords.",
    points: [
      "Navigate to the Retailer Portal login screen (/login).",
      "Enter registered Kirana phone: 9826000001 (Sharma Kirana Store).",
      "Tap 'Send Verification Code' to trigger secure OTP generation.",
      "Read the 6-digit OTP displayed directly on screen (e.g. 502941).",
      "Enter the code to sign in instantly as shopkeeper Ramesh Sharma.",
    ],
    expandDetails: {
      whyItMatters:
        "Kirana shopkeepers order between customers and forget passwords. One-time SMS OTPs offer fast, zero-friction security on low-end smartphones.",
      whatToObserve:
        "Development OTP banner for instant evaluator testing without waiting for third-party SMS delivery.",
    },
  },
  {
    stepNumber: 4,
    title: "Catalogue & Scheme Ordering",
    targetRoute: "/catalogue",
    targetLabel: "Go to Catalogue",
    summary: "Order cartons or loose packets with instant promotional scheme math.",
    points: [
      "Open the catalogue (/catalogue) showing shop name and credit limit (₹50,000).",
      "Test brand filter pills: tap 'Parle', 'Ghadi', or 'Wagh Bakri'.",
      "On Parle Glucose Biscuit (SKU-BS-075), tap '+' under Master Cases until 10 cases.",
      "Notice the green promotion pill: 'Buy 10 Get 1 Free' automatically unlocked!",
      "Test loose unit ordering: tap '+' under Loose Packets to order individual packs.",
    ],
    expandDetails: {
      whyItMatters:
        "Supports dual-unit demand (Master Wholesale Cases + Cut-Case Loose Packets) with transparent ex-GST and incl-GST pricing preventing billing disputes.",
      whatToObserve:
        "Live scheme progression alerts nudging the shopkeeper to reach the next discount threshold.",
    },
  },
  {
    stepNumber: 5,
    title: "WhatsApp, Photo & Voice AI",
    targetRoute: "/quick-order",
    targetLabel: "Go to Quick Order",
    summary: "Multimodal AI order capture from WhatsApp text, paper slips, or voice notes.",
    points: [
      "Open the AI Quick Order hub (/quick-order).",
      "Mode 1 (Text): Click 'Template 1: Hinglish WhatsApp' and tap 'Parse Order Text'.",
      "Mode 2 (Photo): Tap 'Slip Photo' tab -> tap '1-Click Kirana Slip Test' (uploaded to Neon Object Storage!).",
      "Mode 3 (Voice): Tap 'Hindi Voice' tab -> tap '1-Click Hindi Audio Test' with audio player preview.",
      "Resolve any ambiguous units (Case vs Pack), then tap 'Review Cart & Schemes'.",
    ],
    expandDetails: {
      whyItMatters:
        "Kirana merchants frequently order via messy WhatsApp messages, crumpled paper slips, or spoken Hindi voice notes. The system parses all three and uploads media to cloud storage for desk audit.",
      whatToObserve:
        "Context clause pre-processor prevents token collision when merchants write notes like 'case contains 24 pkts'.",
    },
  },
  {
    stepNumber: 6,
    title: "Commercial Cart & Credit Hold",
    targetRoute: "/cart",
    targetLabel: "Go to Cart",
    summary: "Review commercial invoice math, 50/50 MP GST, and credit headroom.",
    points: [
      "View commercial invoice: ex-GST Subtotal, Trade Schemes, and 50/50 CGST + SGST.",
      "Observe the Free Goods Box showing free cartons unlocked at ₹0.00.",
      "Review the live Credit Exposure Meter showing available balance headroom.",
      "Zero Dead Buttons: Exceeding credit switches to 'Place Order (Credit Hold)' without blocking.",
      "Tap 'Confirm & Place Order' to dispatch order to the warehouse desk!",
    ],
    expandDetails: {
      whyItMatters:
        "Guarantees compliance with Madhya Pradesh 50/50 GST regulations and ensures retailers never face broken or disabled submit buttons during credit overruns.",
      whatToObserve:
        "Stock locking deducts warehouse inventory for both paid goods and promotional free goods atomically.",
    },
  },
  {
    stepNumber: 7,
    title: "Desk Verification & Tally XML",
    targetRoute: "/desk",
    targetLabel: "Go to Order Desk",
    summary: "Warehouse clerk verifies orders, checks slips, and exports to Tally ERP.",
    points: [
      "Return to the Order Desk (/desk) to see the fresh order in the queue!",
      "If Credit Hold triggered: tap 'Release Hold' and enter clerk authorization note.",
      "Tap 'Verify' to open the order: view attached Kirana slip photo or listen to voice note!",
      "Click 'Generate Van Manifest' to view driver route delivery and box pick-lists.",
      "Click 'Export Tally XML' to download the ready-to-import Tally Prime sales voucher.",
    ],
    expandDetails: {
      whyItMatters:
        "Closes the complete FMCG distribution loop: from merchant capture to desk clerk OCC conflict safety, truck loading manifests, and accounting ledger export.",
      whatToObserve:
        "Tally XML splits <ACTUALQTY> (paid + free cartons) and <BILLEDQTY> (paid only) exactly to Indian accounting standards.",
    },
  },
];

export default function WalkthroughGuide() {
  const router = useRouter();
  const pathname = usePathname();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Load persisted step from localStorage on mount
  useEffect(() => {
    try {
      const savedIndex = localStorage.getItem("isolabs_walkthrough_step");
      if (savedIndex !== null) {
        const idx = parseInt(savedIndex, 10);
        if (!isNaN(idx) && idx >= 0 && idx < STEPS.length) {
          setCurrentStepIndex(idx);
        }
      }
      const savedMinimized = localStorage.getItem("isolabs_walkthrough_minimized");
      if (savedMinimized === "true") {
        setIsMinimized(true);
      }
    } catch {}
  }, []);

  const currentStep = STEPS[currentStepIndex];

  const handleStepChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < STEPS.length) {
      setCurrentStepIndex(newIndex);
      setIsExpanded(false);
      try {
        localStorage.setItem("isolabs_walkthrough_step", newIndex.toString());
      } catch {}
    }
  };

  const toggleMinimized = () => {
    const nextVal = !isMinimized;
    setIsMinimized(nextVal);
    try {
      localStorage.setItem("isolabs_walkthrough_minimized", nextVal ? "true" : "false");
    } catch {}
  };

  const handleNavigateToTarget = () => {
    router.push(currentStep.targetRoute);
  };

  // Master Absolute Zero Reset
  const handleAbsoluteZeroReset = async () => {
    if (
      !confirm(
        "Wipe everything to Absolute Zero?\n\nThis will clear all SKUs, Retailers, and Orders to a completely blank database so you can re-test the entire walkthrough from Step 1."
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch("/api/setup/reset-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "absolute_zero" }),
      });
      const data = await res.json();
      if (data.success) {
        // Reset walkthrough to Step 1
        handleStepChange(0);
        try {
          localStorage.removeItem("isolabs_draft_cart");
          localStorage.removeItem("isolabs_order_media");
        } catch {}
        router.push("/setup");
      }
    } catch (err) {
      alert("Failed to reset database: " + err);
    } finally {
      setResetting(false);
    }
  };

  // Minimized Floating Pill on the Left Edge
  if (isMinimized) {
    return (
      <div className="fixed left-3 top-20 z-50">
        <button
          type="button"
          onClick={toggleMinimized}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 hover:bg-slate-800 transition-all cursor-pointer group"
        >
          <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
          <span className="text-xs font-bold tracking-tight">
            Tour: Step {currentStep.stepNumber}/{STEPS.length}
          </span>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        </button>
      </div>
    );
  }

  // Active step progress width (no percentage text, just the bar)
  const progressRatio = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <aside
      aria-label="Interactive Walkthrough"
      className="fixed left-3 top-16 z-50 w-80 max-h-[85vh] flex flex-col bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-md overflow-hidden transition-all duration-200 select-none"
    >
      {/* 1. Header with Step Counter & Progress Bar (No % number, just the bar) */}
      <div className="p-3.5 pb-2.5 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block leading-tight">
                Evaluation Tour
              </span>
              <h2 className="text-xs font-bold text-white leading-tight">
                Step {currentStep.stepNumber} of {STEPS.length}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Reset to Zero Button */}
            <button
              type="button"
              onClick={handleAbsoluteZeroReset}
              disabled={resetting}
              title="Reset Database to Absolute Zero"
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin text-red-400" : ""}`} />
            </button>

            {/* Minimize Button */}
            <button
              type="button"
              onClick={toggleMinimized}
              title="Minimize to Left Margin"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar (Pure bar without percentage text as requested) */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressRatio}%` }}
          />
        </div>
      </div>

      {/* 2. Step Title & Subtitle */}
      <div className="px-3.5 pt-3 pb-2 border-b border-slate-800/60">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>{currentStep.title}</span>
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
          {currentStep.summary}
        </p>
      </div>

      {/* 3. Rectangular Point-Wise Steps (4-5 points clearly visible with Expand at Bottom-Right) */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-2 text-xs scrollbar-thin scrollbar-thumb-slate-700">
        <div className="space-y-1.5 relative pb-6">
          {currentStep.points.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-2 text-slate-300 leading-snug">
              <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                {idx + 1}
              </span>
              <span className="text-[11px] font-normal">{pt}</span>
            </div>
          ))}

          {/* Small Expand Button on the Bottom-Right of that portion */}
          <div className="absolute right-0 bottom-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors cursor-pointer shadow-xs"
            >
              {isExpanded ? (
                <>
                  <span>Less</span>
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>[+] Expand</span>
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Technical Context Box (Slides open when [+] Expand is tapped) */}
        {isExpanded && (
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-emerald-500/30 text-[11px] space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Why this matters:
              </span>
              <p className="text-slate-300 leading-relaxed mt-0.5">
                {currentStep.expandDetails.whyItMatters}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Key Observation:
              </span>
              <p className="text-slate-400 leading-relaxed mt-0.5">
                {currentStep.expandDetails.whatToObserve}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Action & Navigation Footer */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2">
        {/* Direct Screen Shortcut Button */}
        <button
          type="button"
          onClick={handleNavigateToTarget}
          className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            pathname === currentStep.targetRoute
              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          <span>
            {pathname === currentStep.targetRoute
              ? `You are on ${currentStep.targetRoute}`
              : `🚀 ${currentStep.targetLabel} (${currentStep.targetRoute})`}
          </span>
          {pathname !== currentStep.targetRoute && <ExternalLink className="w-3.5 h-3.5 shrink-0" />}
        </button>

        {/* Step Navigation Controls (Prev / Next) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => handleStepChange(currentStepIndex - 1)}
            disabled={currentStepIndex === 0}
            className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={() => handleStepChange(currentStepIndex + 1)}
            disabled={currentStepIndex === STEPS.length - 1}
            className="flex-1 py-1.5 px-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Next Step</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
