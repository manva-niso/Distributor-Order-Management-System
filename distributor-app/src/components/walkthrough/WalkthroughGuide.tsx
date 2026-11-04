"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  GripHorizontal,
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

  // Dragging & Positioning State
  const [position, setPosition] = useState({ x: 16, y: 64 });
  const [size, setSize] = useState({ width: 330, height: 530 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
  }>({ startX: 0, startY: 0, initialPosX: 16, initialPosY: 64 });

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    initialW: number;
    initialH: number;
  }>({ startX: 0, startY: 0, initialW: 330, initialH: 530 });

  // Load persisted state & adapt for mobile
  useEffect(() => {
    try {
      const savedIndex = localStorage.getItem("isolabs_walkthrough_step");
      if (savedIndex !== null) {
        const idx = parseInt(savedIndex, 10);
        if (!isNaN(idx) && idx >= 0 && idx < STEPS.length) {
          setCurrentStepIndex(idx);
        }
      }

      const isMobile = window.innerWidth < 640;
      const savedMinimized = localStorage.getItem("isolabs_walkthrough_minimized");

      // On phones, start minimized by default so it doesn't block the screen
      if (savedMinimized !== null) {
        setIsMinimized(savedMinimized === "true");
      } else if (isMobile) {
        setIsMinimized(true);
      }

      // Default position / dimensions based on screen width
      const initialW = isMobile ? Math.min(320, window.innerWidth - 24) : 330;
      const initialH = isMobile ? 480 : 530;
      setSize({ width: initialW, height: initialH });

      const savedPos = localStorage.getItem("isolabs_walkthrough_pos");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const clampedX = Math.max(0, Math.min(parsed.x, window.innerWidth - initialW));
          const clampedY = Math.max(0, Math.min(parsed.y, window.innerHeight - 80));
          setPosition({ x: clampedX, y: clampedY });
        }
      } else if (isMobile) {
        // Position at bottom-right corner as a floating pill on mobile
        setPosition({ x: Math.max(8, window.innerWidth - 180), y: window.innerHeight - 130 });
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

  // DRAG HANDLERS (Mouse & Touch)
  const onStartDrag = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      dragRef.current = {
        startX: clientX,
        startY: clientY,
        initialPosX: position.x,
        initialPosY: position.y,
      };
    },
    [position]
  );

  const onDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;

      const currentWidth = isMinimized ? 170 : size.width;
      const currentHeight = isMinimized ? 44 : size.height;

      const newX = Math.max(0, Math.min(dragRef.current.initialPosX + deltaX, window.innerWidth - currentWidth));
      const newY = Math.max(0, Math.min(dragRef.current.initialPosY + deltaY, window.innerHeight - currentHeight));

      setPosition({ x: newX, y: newY });
    },
    [isDragging, isMinimized, size]
  );

  const onEndDrag = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      try {
        localStorage.setItem("isolabs_walkthrough_pos", JSON.stringify(position));
      } catch {}
    }
  }, [isDragging, position]);

  // RESIZE HANDLERS (Mouse & Touch)
  const onStartResize = useCallback(
    (clientX: number, clientY: number, e: React.SyntheticEvent) => {
      e.stopPropagation();
      setIsResizing(true);
      resizeRef.current = {
        startX: clientX,
        startY: clientY,
        initialW: size.width,
        initialH: size.height,
      };
    },
    [size]
  );

  const onResizeMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isResizing) return;
      const deltaX = clientX - resizeRef.current.startX;
      const deltaY = clientY - resizeRef.current.startY;

      const newW = Math.max(260, Math.min(resizeRef.current.initialW + deltaX, window.innerWidth - position.x - 8));
      const newH = Math.max(380, Math.min(resizeRef.current.initialH + deltaY, window.innerHeight - position.y - 8));

      setSize({ width: newW, height: newH });
    },
    [isResizing, position]
  );

  const onEndResize = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
    }
  }, [isResizing]);

  // Global Pointer Listeners for Smooth Drag & Resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) onDragMove(e.clientX, e.clientY);
      if (isResizing) onResizeMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      onEndDrag();
      onEndResize();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (isDragging || isResizing) {
          e.preventDefault(); // Prevent page scroll while dragging pop-up
          const touch = e.touches[0];
          if (isDragging) onDragMove(touch.clientX, touch.clientY);
          if (isResizing) onResizeMove(touch.clientX, touch.clientY);
        }
      }
    };

    const handleTouchEnd = () => {
      onEndDrag();
      onEndResize();
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, isResizing, onDragMove, onEndDrag, onResizeMove, onEndResize]);

  // 1. Minimized Floating Draggable Pill (Mobile-Friendly, Never Blocks View)
  if (isMinimized) {
    return (
      <div
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          touchAction: "none",
        }}
        className="transition-transform duration-75 select-none"
      >
        <div
          onMouseDown={(e) => onStartDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) onStartDrag(e.touches[0].clientX, e.touches[0].clientY);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 hover:bg-slate-800 transition-colors cursor-grab active:cursor-grabbing backdrop-blur-md"
        >
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex items-center gap-1.5" onClick={toggleMinimized}>
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-tight">
              Tour {currentStep.stepNumber}/{STEPS.length}
            </span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 hover:text-white ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Active step progress width (no percentage text, pure bar)
  const progressRatio = ((currentStepIndex + 1) / STEPS.length) * 100;

  // 2. Full Draggable & Resizable Pop-Up Window
  return (
    <aside
      aria-label="Interactive Walkthrough Pop-up"
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 9999,
      }}
      className="flex flex-col bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md overflow-hidden transition-shadow select-none"
    >
      {/* HEADER (Draggable Area) */}
      <div
        onMouseDown={(e) => onStartDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) onStartDrag(e.touches[0].clientX, e.touches[0].clientY);
        }}
        className="p-3 pb-2.5 border-b border-slate-800 bg-slate-950/90 cursor-grab active:cursor-grabbing flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors" />
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block leading-tight">
                Walkthrough
              </span>
              <h2 className="text-xs font-bold text-white leading-tight">
                Step {currentStep.stepNumber} of {STEPS.length}
              </h2>
            </div>
          </div>

          <div
            className="flex items-center gap-1"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Absolute Zero Reset */}
            <button
              type="button"
              onClick={handleAbsoluteZeroReset}
              disabled={resetting}
              title="Reset Database to Absolute Zero"
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin text-red-400" : ""}`} />
            </button>

            {/* Minimize Window */}
            <button
              type="button"
              onClick={toggleMinimized}
              title="Minimize to Floating Pill"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar (Pure bar without percentage number as requested) */}
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressRatio}%` }}
          />
        </div>
      </div>

      {/* STEP TITLE & SUMMARY */}
      <div className="px-3.5 pt-2.5 pb-2 border-b border-slate-800/60 shrink-0">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <span>{currentStep.title}</span>
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
          {currentStep.summary}
        </p>
      </div>

      {/* POINT-WISE INSTRUCTIONS (4-5 points clearly visible with Expand at Bottom-Right) */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-2 text-xs scrollbar-thin scrollbar-thumb-slate-700">
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

        {/* Expandable Technical Context (Shown when [+] Expand is tapped) */}
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

      {/* FOOTER CONTROLS & RESIZE HANDLE */}
      <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 space-y-1.5 shrink-0 relative">
        {/* Direct Screen Shortcut Button */}
        <button
          type="button"
          onClick={handleNavigateToTarget}
          className={`w-full py-1.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            pathname === currentStep.targetRoute
              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          <span>
            {pathname === currentStep.targetRoute
              ? `You are on ${currentStep.targetRoute}`
              : `🚀 ${currentStep.targetLabel}`}
          </span>
          {pathname !== currentStep.targetRoute && <ExternalLink className="w-3.5 h-3.5 shrink-0" />}
        </button>

        {/* Prev / Next Controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleStepChange(currentStepIndex - 1)}
            disabled={currentStepIndex === 0}
            className="flex-1 py-1 px-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={() => handleStepChange(currentStepIndex + 1)}
            disabled={currentStepIndex === STEPS.length - 1}
            className="flex-1 py-1 px-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Next Step</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* RESIZE HANDLE on bottom-right corner */}
        <div
          onMouseDown={(e) => onStartResize(e.clientX, e.clientY, e)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              onStartResize(e.touches[0].clientX, e.touches[0].clientY, e);
            }
          }}
          title="Drag to resize window"
          className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center text-slate-600 hover:text-emerald-400 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
