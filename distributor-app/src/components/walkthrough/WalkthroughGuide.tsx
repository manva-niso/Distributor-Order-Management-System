"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type StepCategory = "DEMAND" | "EDGE_CASE";

export interface StepItem {
  id: number;
  category: StepCategory;
  title: string;
  route: string;
  summary: string;
  actions: string[];
  whyItMatters: string;
}

export const WALKTHROUGH_STEPS: StepItem[] = [
  // --- PART 1: CUSTOMER DEMANDS IN SEQUENCE ---
  {
    id: 1,
    category: "DEMAND",
    title: "1. Load Catalog & Kiranas (0 Orders)",
    route: "/setup",
    summary: "Load wholesale FMCG catalog with 0 orders — pristine start.",
    actions: [
      "Open Setup (/setup) — see 0 records at start.",
      "Click '🌟 Master Wholesale FMCG (36 SKUs)' to seed products & 8 Kiranas.",
      "Notice Orders = 0. Real orders are placed only by Kiranas, not pre-seeded.",
    ],
    whyItMatters: "Proves zero dummy data lock-in. Real distributor workflow starting from absolute zero.",
  },
  {
    id: 2,
    category: "DEMAND",
    title: "2. Retailer Login (SMS OTP)",
    route: "/login",
    summary: "Log out of desk and log in as an authorized retail shopkeeper.",
    actions: [
      "Tap the Log Out icon in the top right header.",
      "On /login, 1-click select Sharma Kirana Store (9826000001).",
      "Enter Dev OTP code (716716 or displayed code) to enter buyer portal.",
    ],
    whyItMatters: "Strict seat isolation: You are now truly experiencing the Kirana buyer seat without desk privileges.",
  },
  {
    id: 3,
    category: "DEMAND",
    title: "3. Vernacular WhatsApp Order",
    route: "/quick-order",
    summary: "Order via WhatsApp text in conversational Hinglish/Hindi.",
    actions: [
      "Go to Quick Order (/quick-order).",
      "Type or paste: 'bhaiya 5 peti biscuit chhota, 2 peti ghadi powder 1 kg'.",
      "Tap 'Process Order Text' — see Parle-G & Ghadi 96% confidence matches.",
      "Tap 'Confirm & Move to Cart' and place order — stored live in Neon PostgreSQL!",
    ],
    whyItMatters: "Kiranas order in informal conversational language; safe AI maps units & quantities instantly.",
  },
  {
    id: 4,
    category: "DEMAND",
    title: "4. Catalogue Cart & Scheme Math",
    route: "/catalogue",
    summary: "Browse catalog with 48px touch steppers, unlocked trade schemes & MP GST.",
    actions: [
      "Open Catalogue (/catalogue) — see 36 SKUs across Food, Detergent & Personal Care.",
      "Increase Parle-G 75g to 10 cases — watch '+1 Free Case Unlocked' badge appear.",
      "Increase Ghadi Powder 1kg to 5 cases (or Good Day to 4 cases) — watch bulk slab discount unlock.",
      "View Cart (/cart) — review promotional benefits, CGST 9% + SGST 9%, and place order.",
    ],
    whyItMatters: "Transparent trade promotion engine: circular 92/11/2019 compliant ₹0 promotional billing.",
  },
  {
    id: 5,
    category: "DEMAND",
    title: "5. Desk Triage & Split-Screen",
    route: "/desk",
    summary: "Switch to desk to verify raw WhatsApp text side-by-side with items.",
    actions: [
      "Log out and log in as Sunil Clerk (Order Desk: 9826000099).",
      "On /desk, see Sharma Kirana's order in the live queue with badge 'AI Text'.",
      "Click 'Verify' to open split-screen: raw text on left, verified items on right.",
      "Adjust quantities if needed, then click 'Save & Confirm Order' (updates Neon DB).",
    ],
    whyItMatters: "Human-in-the-loop: Distributor verifies every vernacular order before dispatch.",
  },
  {
    id: 6,
    category: "DEMAND",
    title: "6. Van Manifest & Tally XML",
    route: "/desk",
    summary: "Warehouse loading sheet by route and 1-click Tally Prime ERP voucher export.",
    actions: [
      "On /desk, open 'Delivery Van Manifest' tab.",
      "View Napier Town Route #4 manifest: driver stop sequence, vehicle capacity, and payload kg.",
      "Switch to 'Orders Queue' and click 'Export Tally XML' for accounting vouchers.",
    ],
    whyItMatters: "Closes the complete loop from Kirana phone order to physical truck loading and ERP accounting vouchers.",
  },

  // --- PART 2: RIGOROUS EDGE CASES (AFTER DEMANDS MET) ---
  {
    id: 7,
    category: "EDGE_CASE",
    title: "7. Out-of-Catalog ('Chips' Test)",
    route: "/quick-order",
    summary: "Kirana orders an item outside the catalog — honest rejection.",
    actions: [
      "Go to Quick Order (/quick-order).",
      "Tap test chip '🚫 Chips' (or type '10 peti chips, 5 peti lays').",
      "Tap 'Process Order Text' — observe confidence drops to 12% floor.",
      "Flagged as UNKNOWN_SKU: Never incorrectly matches biscuits or soap!",
    ],
    whyItMatters: "Invariant [A16] 'Ask, Never Guess': Safe AI refuses to guess customer money on items not sold.",
  },
  {
    id: 8,
    category: "EDGE_CASE",
    title: "8. Polysemic Unit ('Dabba' Test)",
    route: "/quick-order",
    summary: "Kirana uses ambiguous packaging word 'dabba' — interactive unit prompt.",
    actions: [
      "On /quick-order, tap test chip '⚖️ Ghee' (or type '5 dabba amul ghee').",
      "Tap 'Process Order Text' — confidence capped at 68% (AMBIGUOUS_UNIT).",
      "Interactive prompt triggers: 'Did you mean 1L Tin or 500ml Jar?'.",
      "Select intended unit before order can be finalized.",
    ],
    whyItMatters: "Prevents 10x quantity discrepancies caused by ambiguous local Hindi trade terminology.",
  },
  {
    id: 9,
    category: "EDGE_CASE",
    title: "9. Loose Cut-Pack ('Maggi' Test)",
    route: "/quick-order",
    summary: "Kirana requests loose packets from wholesale master case.",
    actions: [
      "On /quick-order, tap test chip '📦 Maggi' (or type '40 packet maggi').",
      "Tap 'Process Order Text' — detects BROKEN_CASE (case has 96 pkts).",
      "Prompts choice: Round up to 1 full case (₹1,152 case rate) or 40 loose pkts (₹12 piece rate).",
    ],
    whyItMatters: "Wholesale margin protection: prevents broken case losses while offering retail flexibility.",
  },
  {
    id: 10,
    category: "EDGE_CASE",
    title: "10. Credit Limit Breach & Hold",
    route: "/desk",
    summary: "Shopkeeper exceeding credit limit is placed on CREDIT_HOLD.",
    actions: [
      "Log in as Gupta Daily Needs (9826000003, credit available: ₹2,000).",
      "Place order over ₹25,000 — order is received with status CREDIT_HOLD.",
      "Relog in as Sunil Clerk (/desk) and open 'Credit Holds' tab.",
      "Inspect ledger and click 'Release Hold' with authorization note.",
    ],
    whyItMatters: "Protects distributor working capital against default while enabling managerial override.",
  },
  {
    id: 11,
    category: "EDGE_CASE",
    title: "11. 14-Day Dormant Retention",
    route: "/desk",
    summary: "Detect inactive Kiranas and send 1-tap WhatsApp retention deals.",
    actions: [
      "On /desk, switch to 'Dormant Kiranas' tab.",
      "View shops inactive for >14 days with CRITICAL churn risk.",
      "Click WhatsApp icon to launch pre-composed Hindi offer deal on WhatsApp Web.",
    ],
    whyItMatters: "Recovers lapsed revenue before shopkeepers permanently switch to rival wholesale distributors.",
  },
  {
    id: 12,
    category: "EDGE_CASE",
    title: "12. Multi-Clerk OCC Locking",
    route: "/desk",
    summary: "Optimistic concurrency control prevents two clerks overwriting same order.",
    actions: [
      "Simultaneous edits: If Clerk A and Clerk B open Order #ORD-101 at the same time.",
      "Clerk A saves changes -> occVersion increments from 1 to 2.",
      "Clerk B attempts to save with stale version -> Server rejects with HTTP 409 Conflict.",
    ],
    whyItMatters: "Guarantees zero duplicate dispatch or conflicting pallet picks in busy morning warehouse shifts.",
  },
  {
    id: 13,
    category: "EDGE_CASE",
    title: "13. Master Clean Slate (Wipe to 0)",
    route: "/setup",
    summary: "Wipe everything back to 0 SKUs, 0 Retailers, 0 Orders anytime.",
    actions: [
      "Go to Setup (/setup) or tap Clean Slate on /desk.",
      "Click 'Master Delete (Wipe All to 0)' button.",
      "Verify row counts return to 0 SKUs, 0 Retailers, 0 Orders in Neon DB.",
    ],
    whyItMatters: "Evaluators can re-test the entire onboarding flow from true zero anytime.",
  },
  {
    id: 14,
    category: "EDGE_CASE",
    title: "14. Single-Writer Kirana Lock",
    route: "/login",
    summary: "Blocks concurrent multi-device logins for the same Kirana store to protect ledger integrity.",
    actions: [
      "Log into Sharma Kirana (9826000001) in Window A.",
      "Open Window B/Incognito, enter 9826000001 + OTP -> Observe amber lock: 'User already logged in'.",
      "Click 'Log Out All Other Sessions' -> clears remote session lock while preserving your entered OTP.",
      "Click 'Verify & Login' -> successfully reclaims store access.",
    ],
    whyItMatters: "Enforces single-writer serializability [A49], preventing double-deductions and ledger race conditions.",
  },
  {
    id: 15,
    category: "EDGE_CASE",
    title: "15. Persistent Order Re-hydration",
    route: "/orders",
    summary: "Guarantees placed orders permanently persist across relogins and serverless cold starts.",
    actions: [
      "Place an order in /cart -> note generated order ID (e.g. ORD-2026-0001).",
      "Log out via top right header button, refresh browser or trigger server cold start.",
      "Log back into the same store -> open Orders (/orders).",
      "Verify previous order and line items remain permanently visible from durable Neon PostgreSQL.",
    ],
    whyItMatters: "Eliminates serverless cold-start memory loss [A51]; durable Neon PostgreSQL system of record.",
  },
  {
    id: 16,
    category: "EDGE_CASE",
    title: "16. Multi-Store Real-Time Stock Sync",
    route: "/catalogue",
    summary: "Instant live inventory sync across all retailers like movie ticket booking; zero-stock checkout block.",
    actions: [
      "Open Sharma Kirana (/catalogue) in Window A and Verma General in Window B side-by-side.",
      "In Window A, buy cases of an SKU with limited stock (e.g. 5 cases of Marie Gold).",
      "Watch Window B available stock decrement live with 0ms delay without page refresh.",
      "When stock reaches 0, observe Window B flip to red 'OUT OF STOCK' badge with checkout blocker in /cart.",
    ],
    whyItMatters: "Prevents warehouse double-selling and overselling [A52] with instant 0ms SSE / BroadcastChannel sync.",
  },
  {
    id: 17,
    category: "EDGE_CASE",
    title: "17. Zero-Drop Quick-Order to Cart",
    route: "/quick-order",
    summary: "Dual-write mirroring & 0ms optimistic mount hydration guarantees zero dropped items.",
    actions: [
      "In Quick Order (/quick-order), paste colloquial text: 'bhaiya 5 peti biscuit chhota'.",
      "Click 'Parse Order Text' -> AI matches 5 cases of Parle-G.",
      "Click 'Move to Cart' -> arrives at /cart with 0ms delay.",
      "Observe items immediately populated in cart via loadScopedCart [A53] without blank-cart flashes.",
    ],
    whyItMatters: "Guarantees zero dropped items across async auth handshakes, desk clerk sessions, and mobile devices.",
  },
  {
    id: 18,
    category: "DEMAND",
    title: "18. Bilingual Vernacular Toggle",
    route: "/catalogue",
    summary: "1-tap English / Hindi toggle translating complex wholesale terms into local market phrasing.",
    actions: [
      "On /catalogue, click 'हिन्दी' toggle button in the top header.",
      "Observe terms seamlessly translate: 'पूरी पेटी' (Cases), 'खुले पैकेट' (Loose Packs), 'स्टॉक समाप्त' (Out of Stock), 'उधार सीमा' (Credit Limit).",
      "Toggle back to 'EN' anytime with zero state loss or cart disruption.",
    ],
    whyItMatters: "Crucial cultural ergonomics: Empowers non-English speaking Kirana owners across Madhya Pradesh.",
  },
];

export default function WalkthroughGuide() {
  const router = useRouter();
  const pathname = usePathname();

  // Tab Filter: "ALL" | "DEMAND" | "EDGE_CASE"
  const [activeTab, setActiveTab] = useState<"ALL" | "DEMAND" | "EDGE_CASE">("ALL");

  // Expanded state per step
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({ 1: true });
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const [isMinimized, setIsMinimized] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Dragging & Positioning State
  const [position, setPosition] = useState({ x: 16, y: 64 });
  const [size, setSize] = useState({ width: 340, height: 550 });
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
  }>({ startX: 0, startY: 0, initialW: 340, initialH: 550, mode: "both" });

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
          const clampedW = Math.max(280, Math.min(parsedSize.width, window.innerWidth - 20));
          const clampedH = Math.max(360, Math.min(parsedSize.height, window.innerHeight - 40));
          setSize({ width: clampedW, height: clampedH });
        }
      } else {
        const initialW = isMobile ? Math.min(320, window.innerWidth - 24) : 340;
        const initialH = isMobile ? 480 : 550;
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
        setPosition({ x: Math.max(8, window.innerWidth - 200), y: window.innerHeight - 130 });
      }
    } catch {}
  }, []);

  // Filtered steps based on activeTab
  const filteredSteps = useMemo(() => {
    if (activeTab === "ALL") return WALKTHROUGH_STEPS;
    return WALKTHROUGH_STEPS.filter((step) => step.category === activeTab);
  }, [activeTab]);

  // Statistics
  const completedCount = useMemo(
    () => Object.values(completedSteps).filter(Boolean).length,
    [completedSteps]
  );
  const totalCount = WALKTHROUGH_STEPS.length;
  const progressRatio = (completedCount / totalCount) * 100;

  const demandCount = useMemo(
    () => WALKTHROUGH_STEPS.filter((s) => s.category === "DEMAND").length,
    []
  );
  const edgeCaseCount = useMemo(
    () => WALKTHROUGH_STEPS.filter((s) => s.category === "EDGE_CASE").length,
    []
  );
  const completedDemands = useMemo(
    () => WALKTHROUGH_STEPS.filter((s) => s.category === "DEMAND" && completedSteps[s.id]).length,
    [completedSteps]
  );
  const completedEdgeCases = useMemo(
    () => WALKTHROUGH_STEPS.filter((s) => s.category === "EDGE_CASE" && completedSteps[s.id]).length,
    [completedSteps]
  );

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
      return;
    }
    const nextVal = !isMinimized;
    setIsMinimized(nextVal);
    try {
      localStorage.setItem("isolabs_walkthrough_minimized", nextVal ? "true" : "false");
    } catch {}
  };

  // Quick size adjust for phones/mobile (decrease/increase)
  const adjustSize = (deltaW: number, deltaH: number) => {
    setSize((prev) => {
      const maxW = typeof window !== "undefined" ? window.innerWidth - 12 : 400;
      const maxH = typeof window !== "undefined" ? window.innerHeight - 24 : 700;
      const newW = Math.max(260, Math.min(prev.width + deltaW, maxW));
      const newH = Math.max(300, Math.min(prev.height + deltaH, maxH));
      const next = { width: newW, height: newH };
      try {
        localStorage.setItem("isolabs_walkthrough_size", JSON.stringify(next));
      } catch {}
      return next;
    });
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

      const currentWidth = isMinimized ? 200 : size.width;
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
        newW = Math.max(280, Math.min(resizeRef.current.initialW + deltaX, window.innerWidth - position.x - 10));
      }
      if (mode === "both" || mode === "vertical") {
        newH = Math.max(360, Math.min(resizeRef.current.initialH + deltaY, window.innerHeight - position.y - 10));
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

  // 1. Minimized Floating Draggable Pill (Explicitly named "Walkthrough")
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
              Walkthrough ({completedCount}/{totalCount})
            </span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 hover:text-white ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Draggable & Resizable Pop-Up Window
  return (
    <aside
      aria-label="Comprehensive Walkthrough Guide"
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
        className="p-3 pb-2 border-b border-slate-800 bg-slate-950/90 cursor-grab active:cursor-grabbing flex flex-col gap-1.5 shrink-0 touch-none select-none"
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
                {completedCount === totalCount ? "All Demands & Edge Cases Done" : "Customer Demands & Edge Cases"}
              </h2>
            </div>
          </div>

          <div
            className="flex items-center gap-1"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Decrease Size (Phone Zoom Out) */}
            <button
              type="button"
              onClick={() => adjustSize(-30, -50)}
              title="Decrease Window Size (Make smaller on mobile)"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Increase Size (Phone Zoom In) */}
            <button
              type="button"
              onClick={() => adjustSize(30, 50)}
              title="Increase Window Size (Make larger on mobile)"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Absolute Zero Reset */}
            <button
              type="button"
              onClick={handleAbsoluteZeroReset}
              disabled={resetting}
              title="Reset Database to Absolute Zero (0 SKUs, 0 Retailers, 0 Orders)"
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

        {/* Category Switcher Tabs */}
        <div className="flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "ALL"
                ? "bg-slate-800 text-white border border-slate-700 shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <span>All</span>
            <span className="text-[9px] px-1 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DEMAND")}
            className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "DEMAND"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                : "text-slate-400 hover:text-emerald-300 hover:bg-slate-900/60"
            }`}
          >
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Demands</span>
            <span className="text-[9px] px-1 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300">
              {completedDemands}/{demandCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("EDGE_CASE")}
            className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "EDGE_CASE"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                : "text-slate-400 hover:text-amber-300 hover:bg-slate-900/60"
            }`}
          >
            <ShieldAlert className="w-2.5 h-2.5" />
            <span>Edge Cases</span>
            <span className="text-[9px] px-1 py-0.2 rounded-full bg-amber-500/30 text-amber-300">
              {completedEdgeCases}/{edgeCaseCount}
            </span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(4, progressRatio)}%` }}
          />
        </div>
      </div>

      {/* TOWERING BARS CONTAINER: Steps in sequence forming a neat scrollable stack */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredSteps.map((step) => {
          const isCurrentRoute = pathname === step.route;
          const isDone = !!completedSteps[step.id];
          const isExpanded = !!expandedSteps[step.id];
          const isDemand = step.category === "DEMAND";

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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-bold truncate block ${
                          isDone ? "text-slate-400 line-through" : "text-white"
                        }`}
                      >
                        {step.title}
                      </span>
                      {/* Badge: Demand vs Edge Case */}
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.2 rounded leading-tight ${
                          isDemand
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {isDemand ? "DEMAND" : "EDGE CASE"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {step.summary}
                    </span>
                  </div>
                </div>

                {/* Right side: Route Pill + Expand toggle */}
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

              {/* EXPAND AREA BELOW THIS STEP */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Point-wise action list */}
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

      {/* RIGHT RESIZE STRIP (Touch & Mouse) */}
      <div
        onMouseDown={(e) => onStartResize(e.clientX, e.clientY, "horizontal", e)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) onStartResize(e.touches[0].clientX, e.touches[0].clientY, "horizontal", e);
        }}
        title="Drag edge to adjust width"
        className="absolute right-0 top-12 bottom-8 w-5 sm:w-2 cursor-ew-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-20 touch-none"
      />

      {/* BOTTOM RESIZE STRIP (Touch & Mouse) */}
      <div
        onMouseDown={(e) => onStartResize(e.clientX, e.clientY, "vertical", e)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) onStartResize(e.touches[0].clientX, e.touches[0].clientY, "vertical", e);
        }}
        title="Drag edge to adjust height"
        className="absolute bottom-0 left-4 right-8 h-5 sm:h-2 cursor-ns-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-20 touch-none"
      />

      {/* FOOTER BAR WITH SUMMARY AND CORNER RESIZE HANDLE */}
      <div className="px-3 py-1.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between shrink-0 relative text-[10px] text-slate-500 font-mono">
        <span>
          {completedCount} of {totalCount} Done ({completedDemands} Demands, {completedEdgeCases} Edge Cases)
        </span>

        {/* Corner Resize Handle with expanded touch target */}
        <div
          onMouseDown={(e) => onStartResize(e.clientX, e.clientY, "both", e)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              onStartResize(e.touches[0].clientX, e.touches[0].clientY, "both", e);
            }
          }}
          title="Drag corner to adjust width & height"
          className="w-8 h-8 -mr-2 -mb-1 cursor-nwse-resize flex items-center justify-center text-slate-500 hover:text-emerald-400 active:text-emerald-300 transition-colors z-30 touch-none"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
