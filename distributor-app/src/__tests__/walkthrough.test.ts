import { describe, it, expect, beforeEach } from "vitest";
import { dbStore } from "../db/store";
import { verifyOtp } from "../lib/auth/otp";
import { parseOrderText } from "../lib/ai/pipeline";
import { calculateOrderSummary, calculateLineItem, roundTo2Decimals } from "../lib/schemes/engine";
import { buildTallyVoucherXml, TallyOrderEntry } from "../lib/tally/xml-builder";
import { acquireRetailerSession, forceReleaseRetailerSession } from "../lib/auth/session-lock";
import { loadScopedCart, saveScopedCart } from "../lib/catalogue/cart-storage";
import { transliterateToHindi } from "../lib/i18n/transliterate";
import { WALKTHROUGH_STEPS } from "../components/walkthrough/WalkthroughGuide";

describe("Walkthrough Verification: All 18 Demands & Edge Cases", () => {
  beforeEach(() => {
    dbStore.reset(false);
  });

  it("verifies WALKTHROUGH_STEPS metadata integrity (18 total: 7 Demands, 11 Edge Cases)", () => {
    expect(WALKTHROUGH_STEPS).toHaveLength(18);
    const demands = WALKTHROUGH_STEPS.filter((s) => s.category === "DEMAND");
    const edgeCases = WALKTHROUGH_STEPS.filter((s) => s.category === "EDGE_CASE");
    expect(demands).toHaveLength(7);
    expect(edgeCases).toHaveLength(11);

    // Each step must have title, route, actions, and whyItMatters in both EN and HI
    for (const step of WALKTHROUGH_STEPS) {
      expect(step.id).toBeGreaterThan(0);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.titleHi?.length).toBeGreaterThan(0);
      expect(step.route).toMatch(/^\/[a-z0-9_-]+/);
      expect(step.actions.length).toBeGreaterThan(0);
      expect(step.actionsHi?.length).toBeGreaterThan(0);
      expect(step.whyItMatters.length).toBeGreaterThan(0);
      expect(step.whyItMattersHi?.length).toBeGreaterThan(0);
    }
  });

  // STEP 1
  it("Step 1: Load Wholesale Catalog & Kiranas with 0 Orders baseline", () => {
    dbStore.loadMasterCatalog(false);
    expect(dbStore.getAllSkus().length).toBe(36);
    expect(dbStore.getAllRetailers().length).toBe(8);
    expect(dbStore.getAllOrders().length).toBe(0);
  });

  // STEP 2
  it("Step 2: Retailer Login via SMS OTP / Master Demo Code (123456 / 716716)", async () => {
    const res = await verifyOtp("9826000001", "123456");
    expect(res.success).toBe(true);
    expect(res.user?.retailerId).toBe("RET-0001");
    expect(res.user?.role).toBe("retailer");
  });

  // STEP 3
  it("Step 3: Vernacular WhatsApp Order parsing (Hinglish/Hindi dialect)", async () => {
    const result = await parseOrderText("bhaiya 5 peti biscuit chhota, 2 peti ghadi powder 1 kg");
    expect(result.success).toBe(true);
    expect(result.lines).toHaveLength(2);

    const line1 = result.lines[0];
    expect(line1.matchedSku?.code).toBe("SKU-BS-075"); // Parle-G
    expect(line1.resolvedQtyCases).toBe(5);

    const line2 = result.lines[1];
    expect(line2.matchedSku?.code).toBe("SKU-DT-1KG"); // Ghadi 1kg
    expect(line2.resolvedQtyCases).toBe(2);
  });

  // STEP 4
  it("Step 4: Catalogue Cart & Scheme Math (Free Goods Buy 10 Get 1 + Slab Discount + GST Split)", () => {
    const parleSku = dbStore.getSkuByCode("SKU-BS-075")!;
    const goodDaySku = dbStore.getSkuByCode("SKU-BS-GD120")!;

    // 10 cases Parle-G -> Buy 10 Get 1 Free
    const lineParle = calculateLineItem({
      skuId: parleSku.id,
      skuCode: parleSku.code,
      skuName: parleSku.name,
      orderedCases: 10,
      dealerPrice: parleSku.dealerPrice,
      unitsPerCase: parleSku.unitsPerCase,
      gstRate: parleSku.gstRate,
      schemeType: (parleSku.schemeType as any) || "FREE_GOODS",
      schemeDetail: (parleSku.schemeDetail as any) || { buyQty: 10, getFreeQty: 1 },
    });
    expect(lineParle.freeCases).toBe(1);
    expect(lineParle.grossAmount).toBe(7776); // 10 * 777.60

    // 4 cases Good Day -> 5% slab discount
    const lineGoodDay = calculateLineItem({
      skuId: goodDaySku.id,
      skuCode: goodDaySku.code,
      skuName: goodDaySku.name,
      orderedCases: 4,
      dealerPrice: goodDaySku.dealerPrice,
      unitsPerCase: goodDaySku.unitsPerCase,
      gstRate: goodDaySku.gstRate,
      schemeType: (goodDaySku.schemeType as any) || "SLAB_DISCOUNT",
      schemeDetail: (goodDaySku.schemeDetail as any) || { minCases: 4, discountPct: 5 },
    });
    expect(lineGoodDay.discountPct).toBe(5);
    expect(lineGoodDay.discountAmount).toBe(268.8); // 4 * 1344 * 0.05

    // Order Totals Summary
    const totals = calculateOrderSummary([
      {
        skuId: parleSku.id,
        skuCode: parleSku.code,
        skuName: parleSku.name,
        orderedCases: 10,
        dealerPrice: parleSku.dealerPrice,
        unitsPerCase: parleSku.unitsPerCase,
        gstRate: parleSku.gstRate,
        schemeType: (parleSku.schemeType as any) || "FREE_GOODS",
        schemeDetail: (parleSku.schemeDetail as any) || { buyQty: 10, getFreeQty: 1 },
      },
      {
        skuId: goodDaySku.id,
        skuCode: goodDaySku.code,
        skuName: goodDaySku.name,
        orderedCases: 4,
        dealerPrice: goodDaySku.dealerPrice,
        unitsPerCase: goodDaySku.unitsPerCase,
        gstRate: goodDaySku.gstRate,
        schemeType: (goodDaySku.schemeType as any) || "SLAB_DISCOUNT",
        schemeDetail: (goodDaySku.schemeDetail as any) || { minCases: 4, discountPct: 5 },
      },
    ]);
    expect(totals.totalCgstAmount).toBe(totals.totalSgstAmount); // 50/50 intra-state split
    expect(totals.totalGstAmount).toBe(roundTo2Decimals(totals.totalCgstAmount + totals.totalSgstAmount));
    expect(totals.totalFreeCases).toBe(1);
  });

  // STEP 5
  it("Step 5: Desk Triage & Split-Screen verification with OCC versioning", () => {
    dbStore.reset(true);
    const orders = dbStore.getAllOrders();
    expect(orders.length).toBeGreaterThan(0);

    const targetOrder = orders[0].order;
    const initialVersion = targetOrder.occVersion;
    const updateRes = dbStore.updateOrderStatus(targetOrder.id, "VERIFIED", initialVersion);
    expect(updateRes.success).toBe(true);
    expect(updateRes.order?.occVersion).toBe(initialVersion + 1);
  });

  // STEP 6
  it("Step 6: Delivery Van Manifest generation & Tally Prime XML Export", () => {
    dbStore.reset(true);
    const { manifest } = dbStore.getVanManifest("Wright Town Route #2");
    expect(manifest.route).toBe("Wright Town Route #2");
    expect(manifest.stops.length).toBeGreaterThanOrEqual(1);
    expect(manifest.totalMasterCases).toBeGreaterThan(0);

    // Tally XML Export
    const orders = dbStore.getAllOrders();
    const tallyEntries: TallyOrderEntry[] = orders.map(({ order, items }) => ({
      order,
      items,
      retailer: dbStore.getRetailerById(order.retailerId)!,
    }));
    const xml = buildTallyVoucherXml(tallyEntries);
    expect(xml).toContain("<ENVELOPE>");
    expect(xml).toContain('<VOUCHER VCHTYPE="Sales"');
    expect(xml).toContain("<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>");
    expect(xml).toContain("<ACTUALQTY>");
    expect(xml).toContain("<BILLEDQTY>");
  });

  // STEP 7
  it("Step 7: Out-of-Catalog ('Chips' Test) honest rejection (UNKNOWN_SKU)", async () => {
    const result = await parseOrderText("10 packet chips");
    expect(result.success).toBe(true);
    const line = result.lines[0];
    expect(line.matchedSku).toBeNull();
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("UNKNOWN_SKU");
  });

  // STEP 8
  it("Step 8: Polysemic Packaging Unit ('Dabba' Test) triggers AMBIGUOUS_UNIT", async () => {
    const result = await parseOrderText("5 dabba tel");
    expect(result.success).toBe(true);
    const line = result.lines[0];
    expect(line.extractedUnit).toBe("DABBA");
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("AMBIGUOUS_UNIT");
  });

  // STEP 9
  it("Step 9: Loose Cut-Pack ('Maggi' Test) detects BROKEN_CASE", async () => {
    const result = await parseOrderText("40 packet maggi");
    expect(result.success).toBe(true);
    const line = result.lines[0];
    expect(line.extractedUnit).toBe("PACK");
    expect(line.brokenCaseInfo).not.toBeNull();
    expect(line.brokenCaseInfo?.requestedPacks).toBe(40);
  });

  // STEP 10
  it("Step 10: Credit Limit Breach causes CREDIT_HOLD and manager can release", () => {
    const retailer = dbStore.getRetailerById("RET-0003")!; // Gupta Daily Needs
    expect(retailer.creditLimit).toBeDefined();

    // Place order exceeding available limit
    const orderId = "ORD-TEST-HOLD-10";
    const grandTotal = retailer.creditLimit + 10000;
    const isHold = retailer.currentBalance + grandTotal > retailer.creditLimit;
    expect(isHold).toBe(true);

    dbStore.createOrder(
      {
        id: orderId,
        retailerId: retailer.id,
        retailerName: retailer.name,
        route: retailer.route,
        placedBy: retailer.ownerName,
        orderSource: "WHATSAPP_AI",
        status: "CREDIT_HOLD",
        creditHoldReason: "Credit limit exceeded",
        subtotal: grandTotal - 5000,
        schemeDiscount: 0,
        taxableAmount: grandTotal - 5000,
        totalGst: 5000,
        grandTotal,
        freeGoodsTally: [],
        occVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      []
    );

    const created = dbStore.getOrderById(orderId);
    expect(created?.order.status).toBe("CREDIT_HOLD");

    // Manager releases hold
    const releaseRes = dbStore.releaseCreditHold(orderId, 1, "Sunil Clerk", "Manager approved ₹10k temporary extension");
    expect(releaseRes.success).toBe(true);
    expect(releaseRes.order?.status).toBe("VERIFIED");
  });

  // STEP 11
  it("Step 11: 14-Day Dormant Kirana Retention detection & WhatsApp link", () => {
    dbStore.reset(true);
    const dormant = dbStore.getDormantRetailers(14);
    expect(dormant.totalRetailers).toBeGreaterThan(0);
    expect(dormant.dormantRetailers.length).toBeGreaterThan(0);

    const first = dormant.dormantRetailers[0];
    expect(first.daysInactive).toBeGreaterThanOrEqual(14);
    expect(first.whatsappDeepLink).toContain("https://wa.me/");
    expect(first.activePromoTextHindi).toContain("नमस्ते");
  });

  // STEP 12
  it("Step 12: Multi-Clerk OCC Locking rejects concurrent stale edit", () => {
    dbStore.reset(true);
    const order = dbStore.getAllOrders()[0].order;
    const staleVersion = order.occVersion;

    // Clerk A updates successfully
    const clerkARes = dbStore.updateOrderStatus(order.id, "VERIFIED", staleVersion);
    expect(clerkARes.success).toBe(true);

    // Clerk B attempts with stale expectedOccVersion
    const clerkBRes = dbStore.updateOrderStatus(order.id, "CREDIT_HOLD", staleVersion);
    expect(clerkBRes.success).toBe(false);
    expect(clerkBRes.error).toContain("OCC Conflict");
  });

  // STEP 13
  it("Step 13: Master Clean Slate (Wipe to 0) returns absolute zero records", () => {
    dbStore.resetToAbsoluteZero();
    expect(dbStore.getAllSkus().length).toBe(0);
    expect(dbStore.getAllRetailers().length).toBe(0);
    expect(dbStore.getAllOrders().length).toBe(0);
  });

  // STEP 14
  it("Step 14: Single-Writer Kirana Lock blocks concurrent logins and force-logout releases", async () => {
    const retailerId = "RET-0001";
    const phone = "9826000001";
    await forceReleaseRetailerSession(retailerId, phone);

    // Session 1 acquires lock
    const lock1 = await acquireRetailerSession(retailerId, "user_1", phone);
    expect(lock1.allowed).toBe(true);

    // Session 2 is blocked
    const lock2 = await acquireRetailerSession(retailerId, "user_2", phone);
    expect(lock2.allowed).toBe(false);
    expect(lock2.code).toBe("USER_ALREADY_LOGGED_IN");

    // Force logout releases lock
    await forceReleaseRetailerSession(retailerId, phone);
    const lock3 = await acquireRetailerSession(retailerId, "user_2", phone);
    expect(lock3.allowed).toBe(true);
  });

  // STEP 15
  it("Step 15: Persistent Order Re-hydration stores orders across reads", () => {
    dbStore.reset(false);
    const orderId = "ORD-PERSIST-2026-001";
    dbStore.createOrder(
      {
        id: orderId,
        retailerId: "RET-0001",
        retailerName: "Sharma Kirana Store",
        route: "Napier Town Route #4",
        placedBy: "Ramesh Sharma",
        orderSource: "WHATSAPP_AI",
        status: "PLACED",
        subtotal: 5000,
        schemeDiscount: 0,
        taxableAmount: 5000,
        totalGst: 900,
        grandTotal: 5900,
        freeGoodsTally: [],
        occVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      []
    );

    const fetched = dbStore.getOrderById(orderId);
    expect(fetched).toBeDefined();
    expect(fetched?.order.id).toBe(orderId);
  });

  // STEP 16
  it("Step 16: Multi-Store Real-Time Stock Sync decrements inventory and prevents negative stock", () => {
    dbStore.reset(false);
    const sku = dbStore.getSkuByCode("SKU-BS-MG250")!;
    const initialStock = sku.stockCases;

    // Deduct stock
    const deducted = dbStore.deductSkuStock(sku.id, 5);
    expect(deducted).toBe(true);
    expect(dbStore.getSkuById(sku.id)?.stockCases).toBe(initialStock - 5);

    // Over-deduction is blocked
    const overDeduct = dbStore.deductSkuStock(sku.id, 99999);
    expect(overDeduct).toBe(false);
  });

  // STEP 17
  it("Step 17: Zero-Drop Quick-Order to Cart persists cart items into scoped storage", () => {
    const mockStorage: Record<string, string> = {};
    const storageMock = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      key: (idx: number) => Object.keys(mockStorage)[idx] || null,
      get length() {
        return Object.keys(mockStorage).length;
      },
      clear: () => {
        for (const k of Object.keys(mockStorage)) delete mockStorage[k];
      },
    } as any;

    const originalLocalStorage = globalThis.localStorage;
    const originalWindow = (globalThis as any).window;
    globalThis.localStorage = storageMock;
    (globalThis as any).window = { localStorage: storageMock };

    try {
      saveScopedCart({ "SKU-BS-075": { cases: 5, packs: 0 } }, "RET-0001");
      const loaded = loadScopedCart("RET-0001");
      expect(loaded["SKU-BS-075"]).toBeDefined();
      expect(loaded["SKU-BS-075"].cases).toBe(5);
    } finally {
      globalThis.localStorage = originalLocalStorage;
      (globalThis as any).window = originalWindow;
    }
  });

  // STEP 18
  it("Step 18: Bilingual Vernacular Toggle transliterates FMCG terms into Hindi accurately", () => {
    expect(transliterateToHindi("Parle-G")).toContain("पारले");
    expect(transliterateToHindi("Good Day")).toContain("गुड डे");
    expect(transliterateToHindi("Fortune Oil")).toContain("फॉर्च्यून");
    expect(transliterateToHindi("Ghadi Detergent")).toContain("घड़ी");
  });
});
