"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Minimize2,
  Maximize2,
  RotateCcw,
  GripHorizontal,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface StepItem {
  id: number;
  title: string;
  route: string;
  summary: string;
  actions: string[];
  whyItMatters: string;
}

const WALKTHROUGH_STEPS: StepItem[] = [
  {
    id: 1,
    title: "1. Setup Master & FMCG Catalog",
    route: "/setup",
    summary: "Start fresh or seed the Master 36-SKU Wholesale FMCG Catalog.",
    actions: [
      "Open the Master Setup Hub (/setup). Notice your database can be wiped to true 0 records.",
      "Click '🌟 Master Wholesale FMCG Database (36 SKUs)' to seed 36 products, 8 kirana merchants, and schemes into Neon PostgreSQL.",
      "Alternatively, upload your own Excel distributor sheet (master_distributor_template_dummy.xlsx).",
      "Check the Live Database Telemetry Strip showing Neon PostgreSQL connection and row counts.",
    ],
    whyItMatters: "Proves zero hardcoded reliance. The first user can start from true 0 or ingest arbitrary FMCG inventories.",
  },
  {
    id: 2,
    title: "2. Vernacular AI Text Ordering & Edge Cases",
    route: "/quick-order",
    summary: "Test live text parsing, out-of-catalog rejection, and packaging guardrails.",
    actions: [
      "Navigate to AI Quick Order (/quick-order).",
      "Test Edge Case A (Out-of-Catalog AI Rejection): Type '10 peti chips' -> Witness honest 12% confidence, UNKNOWN_SKU rejection, and zero hallucination (never guessing biscuits!).",
      "Test Edge Case B (Jabalpur Regional Slang): Type '10 peti pila wala' -> Matches Parle-G 75g via Tier 0 alias (96% confidence).",
      "Test Edge Case C (The Dabba Dilemma): Type '5 dabba dettol' -> Flags AMBIGUOUS_UNIT guardrail (Case vs Inner Box) capped at 67% probability.",
      "Test Edge Case D (Broken Case Cut-Pack): Type '10 packet maggi' -> Flags BROKEN_CASE with loose pack rate (10 < 96 units/case).",
      "Tap 'Review Cart & Schemes' to proceed with your configured order.",
    ],
    whyItMatters: "Enforces Invariant [A16] ('Ask, Never Guess') with Platt logistic calibration. AI never guesses customer money.",
  },
  {
    id: 3,
    title: "3. Kirana Login & Credit Hold Breach",
    route: "/login",
    summary: "Log in as a merchant and trigger automated Credit Hold on credit breach.",
    actions: [
      "Navigate to Retailer Portal login screen (/login).",
      "Log in as Alok Gupta: Phone 9826000003 (Gupta Daily Needs, Credit Limit: ₹60,000, Current: ₹0).",
      "Enter the on-screen 6-digit OTP to authenticate without passwords.",
      "In the Catalogue or Cart, add items exceeding ₹60,000 (e.g. 10 cases Fortune Refined Sunlite Oil).",
      "At Checkout, observe the Credit Exposure Meter turn amber/red.",
      "Tap 'Place Order (Credit Hold)' -> Order is accepted without dead buttons and tagged CREDIT_HOLD with instant WhatsApp dispatch alert.",
    ],
    whyItMatters: "Guarantees zero-dead-button UX while protecting distributor capital from runaway uncollateralized credit.",
  },
  {
    id: 4,
    title: "4. 14-Day Dormancy & WhatsApp Nudges",
    route: "/desk",
    summary: "Detect inactive kiranas and trigger 1-click vernacular WhatsApp nudges.",
    actions: [
      "Navigate to distributor Order Desk (/desk).",
      "Click the 'Dormant Retailers (14+ Days)' tab.",
      "Observe 4 inactive merchants (Gupta 18d, Chouksey 22d, Patel 15d, Bajpai 28d) with Churn Risk calculations.",
      "Click the WhatsApp icon on any dormant counter to inspect the pre-filled vernacular Hindi retention message with slab discount promo.",
    ],
    whyItMatters: "Proactively reactivates lapsed FMCG counters before retailers migrate to competing wholesale distributors.",
  },
  {
    id: 5,
    title: "5. Desk Triage, OCC & Tally Prime XML",
    route: "/desk",
    summary: "Warehouse clerk verifies orders, releases holds, and exports to ERP.",
    actions: [
      "On Order Desk (/desk), locate the credit-held order from Step 3.",
      "Tap 'Release Hold', enter clerk authorization note ('Approved for weekly cycle'), and confirm.",
      "Experience OCC Concurrency: Open order in two tabs to see versioning protect against dual-clerk overwrite collisions.",
      "Click 'Export Tally XML' to download the ready-to-import Tally Prime sales voucher with full GST/HSN splits.",
      "Click 'Generate Van Manifest' for delivery route pick-lists and driver stops.",
    ],
    whyItMatters: "Closes the complete B2B wholesale loop from kirana capture to warehouse dispatch and ERP ledger sync.",
  },
  {
    id: 6,
    title: "6. Master Delete & Clean Slate Reset",
    route: "/setup",
    summary: "Wipe everything back to Absolute Zero whenever needed.",
    actions: [
      "Return to Setup (/setup).",
      "Click the red 'Master Delete (Wipe All)' button in the header or clean slate section.",
      "Select 'Absolute Zero' to wipe all SKUs, Retailers, Orders, and Aliases from both in-memory store and Neon PostgreSQL.",
      "Verify row counts return to 0 SKUs, 0 Retailers, 0 Orders, ready for the next test.",
    ],
    whyItMatters: "Provides full control to first-time users and evaluators to test onboarding from true zero at any time.",
  },
];

export default function WalkthroughGuide() {
  const router = useRouter();
  const pathname = usePathname();

  // Expanded state per step
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({ 1: true });
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const [isMinimized, setIsMinimized] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Dragging & Positioning State
  const [position, setPosition] = useState({ x: 16, y: 64 });
  const [size, setSize] = useState({ width: 330, height: 530 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Ref to track drag movement distance to prevent accidental expand/click
  const dragDistanceRef = useRef<number>(0);

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
    mode: "both" | "horizontal" | "vertical";
  }>({ startX: 0, startY: 0, initialW: 330, initialH: 530, mode: "both" });

  // Load persisted state & adapt for mobile
  useEffect(() => {
    try {
      const isMobile = window.innerWidth < 640;
      const savedMinimized = localStorage.getItem("isolabs_walkthrough_minimized");

      if (savedMinimized !== null) {
        setIsMinimized(savedMinimized === "true");
      } else if (isMobile) {
        setIsMinimized(true);
      }

      // Restore saved size if available
      const savedSize = localStorage.getItem("isolabs_walkthrough_size");
      if (savedSize) {
        const parsedSize = JSON.parse(savedSize);
        if (parsedSize.width && parsedSize.height) {
          const clampedW = Math.max(270, Math.min(parsedSize.width, window.innerWidth - 20));
          const clampedH = Math.max(340, Math.min(parsedSize.height, window.innerHeight - 40));
          setSize({ width: clampedW, height: clampedH });
        }
      } else {
        const initialW = isMobile ? Math.min(320, window.innerWidth - 24) : 330;
        const initialH = isMobile ? 480 : 530;
        setSize({ width: initialW, height: initialH });
      }

      const savedCompleted = localStorage.getItem("isolabs_walkthrough_completed");
      if (savedCompleted) {
        setCompletedSteps(JSON.parse(savedCompleted));
      }

      const savedPos = localStorage.getItem("isolabs_walkthrough_pos");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const clampedX = Math.max(0, Math.min(parsed.x, window.innerWidth - 180));
          const clampedY = Math.max(0, Math.min(parsed.y, window.innerHeight - 60));
          setPosition({ x: clampedX, y: clampedY });
        }
      } else if (isMobile) {
        setPosition({ x: Math.max(8, window.innerWidth - 180), y: window.innerHeight - 130 });
      }
    } catch {}
  }, []);

  // Toggle step expand (checks that user did not just drag)
  const toggleStepExpand = (stepId: number) => {
    if (dragDistanceRef.current > 5) return;
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  // Toggle step completion
  const toggleStepComplete = (stepId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps((prev) => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      try {
        localStorage.setItem("isolabs_walkthrough_completed", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Toggle minimize/maximize (checks that user did not just drag)
  const handleToggleMinimized = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (dragDistanceRef.current > 5) {
      // Ignored: was a drag, not an intentional tap
      return;
    }
    const nextVal = !isMinimized;
    setIsMinimized(nextVal);
    try {
      localStorage.setItem("isolabs_walkthrough_minimized", nextVal ? "true" : "false");
    } catch {}
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
        setCompletedSteps({});
        setExpandedSteps({ 1: true });
        try {
          localStorage.removeItem("isolabs_walkthrough_completed");
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
      dragDistanceRef.current = 0;
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
      dragDistanceRef.current = Math.hypot(deltaX, deltaY);

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
      // Keep dragDistanceRef briefly so click handlers firing immediately after mouseup can check it
      setTimeout(() => {
        dragDistanceRef.current = 0;
      }, 80);
    }
  }, [isDragging, position]);

  // RESIZE HANDLERS (Mouse & Touch)
  const onStartResize = useCallback(
    (clientX: number, clientY: number, mode: "both" | "horizontal" | "vertical", e: React.SyntheticEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = {
        startX: clientX,
        startY: clientY,
        initialW: size.width,
        initialH: size.height,
        mode,
      };
    },
    [size]
  );

  const onResizeMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isResizing) return;
      const deltaX = clientX - resizeRef.current.startX;
      const deltaY = clientY - resizeRef.current.startY;
      const mode = resizeRef.current.mode;

      let newW = size.width;
      let newH = size.height;

      if (mode === "both" || mode === "horizontal") {
        newW = Math.max(270, Math.min(resizeRef.current.initialW + deltaX, window.innerWidth - position.x - 10));
      }
      if (mode === "both" || mode === "vertical") {
        newH = Math.max(340, Math.min(resizeRef.current.initialH + deltaY, window.innerHeight - position.y - 10));
      }

      setSize({ width: newW, height: newH });
    },
    [isResizing, position, size]
  );

  const onEndResize = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      try {
        localStorage.setItem("isolabs_walkthrough_size", JSON.stringify(size));
      } catch {}
    }
  }, [isResizing, size]);

  // Global Pointer Listeners for Dragging & Resizing
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
          e.preventDefault();
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

  // Total completed progress ratio
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressRatio = (completedCount / WALKTHROUGH_STEPS.length) * 100;

  // 1. Minimized Floating Draggable Pill (Dragging will NEVER expand it)
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
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onClick={(e) => handleToggleMinimized(e)}
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-tight">
              Tour ({completedCount}/{WALKTHROUGH_STEPS.length})
            </span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 hover:text-white ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Draggable & Resizable Pop-Up Window
  // Towering Bars Format forming a Rectangle with Expand below each Step
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
        className="p-3 pb-2 border-b border-slate-800 bg-slate-950/90 cursor-grab active:cursor-grabbing flex flex-col gap-1.5 shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors" />
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block leading-tight">
                Evaluation Tour
              </span>
              <h2 className="text-xs font-bold text-white leading-tight">
                {completedCount === WALKTHROUGH_STEPS.length ? "All Steps Completed" : "Step-by-Step Testing"}
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
              onClick={(e) => handleToggleMinimized(e)}
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
            style={{ width: `${Math.max(5, progressRatio)}%` }}
          />
        </div>
      </div>

      {/* TOWERING BARS CONTAINER: Multiple Steps in Bars Format forming a Rectangle */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
        {WALKTHROUGH_STEPS.map((step) => {
          const isCurrentRoute = pathname === step.route;
          const isDone = !!completedSteps[step.id];
          const isExpanded = !!expandedSteps[step.id];

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all ${
                isCurrentRoute
                  ? "border-emerald-500/70 bg-slate-950/90 shadow-sm"
                  : isDone
                  ? "border-slate-800 bg-slate-950/40 opacity-85"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              {/* STEP BAR HEADER CARD */}
              <div
                onClick={() => toggleStepExpand(step.id)}
                className="p-2.5 cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Complete Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => toggleStepComplete(step.id, e)}
                    title={isDone ? "Mark incomplete" : "Mark completed"}
                    className="shrink-0 text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate block ${
                          isDone ? "text-slate-400 line-through" : "text-white"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {step.summary}
                    </span>
                  </div>
                </div>

                {/* Right side: Route Pill + Expand toggle below */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isCurrentRoute
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {step.route}
                  </span>
                  <div className="text-slate-400 hover:text-white">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* EXPAND AREA BELOW THIS STEP (With detailed points & direct navigation) */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Point-wise action list (4-5 points clearly visible) */}
                  <div className="space-y-1.5 pt-1">
                    {step.actions.map((act, aIdx) => (
                      <div key={aIdx} className="flex items-start gap-1.5 text-[11px] text-slate-300 leading-snug">
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-emerald-400 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                          {aIdx + 1}
                        </span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>

                  {/* Why it matters note */}
                  <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                    <strong className="text-emerald-400 font-semibold block mb-0.5">Why this matters:</strong>
                    {step.whyItMatters}
                  </div>

                  {/* Action row below each step: Direct Jump & Mark Done */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(step.route);
                      }}
                      className={`flex-1 py-1 px-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        isCurrentRoute
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                      }`}
                    >
                      <span>{isCurrentRoute ? `You're on ${step.route}` : `🚀 Open ${step.route}`}</span>
                      {!isCurrentRoute && <ExternalLink className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleStepComplete(step.id, e)}
                      className={`py-1 px-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        isDone
                          ? "bg-slate-800 border-slate-700 text-slate-300"
                          : "bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800"
                      }`}
                    >
                      {isDone ? "Completed ✓" : "Mark Done"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RIGHT RESIZE STRIP */}
      <div
        onMouseDown={(e) => onStartResize(e.clientX, e.clientY, "horizontal", e)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) onStartResize(e.touches[0].clientX, e.touches[0].clientY, "horizontal", e);
        }}
        title="Drag edge to adjust width"
        className="absolute right-0 top-12 bottom-6 w-2 cursor-ew-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-20"
      />

      {/* BOTTOM RESIZE STRIP */}
      <div
        onMouseDown={(e) => onStartResize(e.clientX, e.clientY, "vertical", e)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) onStartResize(e.touches[0].clientX, e.touches[0].clientY, "vertical", e);
        }}
        title="Drag edge to adjust height"
        className="absolute bottom-0 left-4 right-6 h-2 cursor-ns-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-20"
      />

      {/* FOOTER BAR WITH PROMINENT CORNER RESIZE HANDLE */}
      <div className="px-3 py-1.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between shrink-0 relative text-[10px] text-slate-500 font-mono">
        <span>{completedCount} of {WALKTHROUGH_STEPS.length} Steps Complete</span>

        {/* Generous Corner Resize Handle (24px Touch Target) */}
        <div
          onMouseDown={(e) => onStartResize(e.clientX, e.clientY, "both", e)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              onStartResize(e.touches[0].clientX, e.touches[0].clientY, "both", e);
            }
          }}
          title="Drag corner to adjust width & height"
          className="w-6 h-6 -mr-1.5 -mb-1 cursor-nwse-resize flex items-center justify-center text-slate-500 hover:text-emerald-400 active:text-emerald-300 transition-colors z-30"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
