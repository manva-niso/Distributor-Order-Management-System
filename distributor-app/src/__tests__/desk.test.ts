import { describe, it, expect, beforeEach } from "vitest";
import { dbStore, StoredOrderItem } from "@/db/store";
import { calculateOrderSummary, InputLineItem } from "@/lib/schemes/engine";

describe("Module 6 - Order Desk Operations, Verification & OCC Suite", () => {
  beforeEach(() => {
    dbStore.reset();
  });

  describe("Desk Queue Retrieval & Operational Stats", () => {
    it("returns pre-seeded demo orders with correct status breakdown", () => {
      const stats = dbStore.getDeskStats();
      expect(stats.totalOrders).toBeGreaterThanOrEqual(4);
      expect(stats.needsReviewCount).toBeGreaterThanOrEqual(1); // ORD-10482
      expect(stats.creditHoldCount).toBeGreaterThanOrEqual(1); // ORD-10483
      expect(stats.verifiedCount).toBeGreaterThanOrEqual(1); // ORD-10484
      expect(stats.totalWholesaleValue).toBeGreaterThan(0);
    });

    it("retrieves full order details including line items and retailer details", () => {
      const orderData = dbStore.getOrderById("ORD-10482");
      expect(orderData).toBeDefined();
      expect(orderData?.order.retailerId).toBe("RET-0001");
      expect(orderData?.order.status).toBe("PLACED");
      expect(orderData?.items).toHaveLength(2);

      const retailer = dbStore.getRetailerById("RET-0001");
      expect(retailer?.name).toBe("Sharma Kirana Store");
      expect(retailer?.route).toBe("Napier Town Route #4");
    });
  });

  describe("Order Desk Line Item Editing & Scheme Recalculation", () => {
    it("allows clerk to adjust case quantities and recalculates commercial invoice", () => {
      const initial = dbStore.getOrderById("ORD-10482")!;
      expect(initial.order.occVersion).toBe(1);

      // Clerk increases Biscuit cases from 5 to 10 (which unlocks 1 Free Promotional Case!)
      const updatedInputs: InputLineItem[] = [
        {
          skuId: "SKU-BS-075",
          skuCode: "SKU-BS-075",
          skuName: "Glucose biscuit 75 g, case of 96",
          orderedCases: 10, // increased to 10
          dealerPrice: 777.6,
          gstRate: 18,
          schemeType: "FREE_GOODS",
          schemeDetail: { buyQty: 10, getFreeQty: 1 },
        },
        {
          skuId: "SKU-DT-1KG",
          skuCode: "SKU-DT-1KG",
          skuName: "Detergent powder 1 kg, case of 20",
          orderedCases: 2,
          dealerPrice: 2030.0,
          gstRate: 18,
          schemeType: "SLAB_DISCOUNT",
          schemeDetail: { minCases: 5, discountPct: 3 },
        },
      ];

      const recalculated = calculateOrderSummary(updatedInputs);
      expect(recalculated.totalFreeCases).toBe(1); // Free case unlocked!
      expect(recalculated.totalDeliveredCases).toBe(13); // 10 + 2 + 1 free

      const newItems: StoredOrderItem[] = recalculated.lines.map((l, i) => ({
        id: `item_edit_${i}`,
        orderId: "ORD-10482",
        skuId: l.skuId,
        skuCode: l.skuCode,
        skuName: l.skuName,
        quantityCases: l.orderedCases,
        freeCases: l.freeCases,
        unitDealerPrice: l.dealerPrice,
        discountPct:
          l.discountAmount > 0 && l.grossAmount > 0
            ? Math.round((l.discountAmount / l.grossAmount) * 100)
            : 0,
        discountAmount: l.discountAmount,
        netLineAmount: l.taxableAmount,
        gstRate: l.gstRate,
        gstAmount: l.totalGstAmount,
      }));

      const freeGoodsTally = recalculated.lines
        .filter((l) => l.freeCases > 0)
        .map((l) => ({ skuId: l.skuId, skuName: l.skuName, freeCases: l.freeCases }));

      const totals = {
        subtotal: recalculated.totalGrossAmount,
        schemeDiscount: recalculated.totalDiscountAmount,
        taxableAmount: recalculated.totalTaxableAmount,
        totalGst: recalculated.totalGstAmount,
        grandTotal: recalculated.grandTotal,
        freeGoodsTally,
      };

      // Clerk confirms order with version 1
      const updateResult = dbStore.updateOrderDetails(
        "ORD-10482",
        newItems,
        totals,
        "VERIFIED",
        1
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.order?.status).toBe("VERIFIED");
      expect(updateResult.order?.occVersion).toBe(2); // Incremented OCC version
      expect(updateResult.order?.freeGoodsTally[0].freeCases).toBe(1);
    });
  });

  describe("Optimistic Concurrency Control (OCC) (Rule [A19])", () => {
    it("rejects simultaneous clerk updates when expected version does not match", () => {
      const order = dbStore.getOrderById("ORD-10482")!;
      expect(order.order.occVersion).toBe(1);

      // Clerk A saves changes with version 1 -> succeeds, version becomes 2
      const clerkASave = dbStore.updateOrderStatus("ORD-10482", "VERIFIED", 1);
      expect(clerkASave.success).toBe(true);
      expect(clerkASave.order?.occVersion).toBe(2);

      // Clerk B attempts to save using stale version 1 -> rejected with OCC Conflict
      const clerkBSave = dbStore.updateOrderDetails(
        "ORD-10482",
        [],
        {
          subtotal: 5000,
          schemeDiscount: 0,
          taxableAmount: 5000,
          totalGst: 900,
          grandTotal: 5900,
          freeGoodsTally: [],
        },
        "VERIFIED",
        1 // Stale expected version!
      );

      expect(clerkBSave.success).toBe(false);
      expect(clerkBSave.conflict).toBe(true);
      expect(clerkBSave.error).toContain("OCC Conflict");
    });
  });

  describe("Credit Hold Clearance (Rule [A14])", () => {
    it("releases credit hold on an over-limit order with authorization notes", () => {
      const heldOrder = dbStore.getOrderById("ORD-10483")!;
      expect(heldOrder.order.status).toBe("CREDIT_HOLD");
      expect(heldOrder.order.occVersion).toBe(1);

      // Desk clerk releases hold with note
      const releaseResult = dbStore.releaseCreditHold(
        "ORD-10483",
        1,
        "Amit Jain (Central Desk)",
        "Customer promised cash payment on delivery"
      );

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.order?.status).toBe("VERIFIED");
      expect(releaseResult.order?.holdReleasedBy).toBe("Amit Jain (Central Desk)");
      expect(releaseResult.order?.holdReleaseNote).toBe(
        "Customer promised cash payment on delivery"
      );
      expect(releaseResult.order?.occVersion).toBe(2);
    });

    it("rejects releasing credit hold if another clerk modified the order", () => {
      // First update increments version to 2
      dbStore.updateOrderStatus("ORD-10483", "CREDIT_HOLD", 1);

      // Stale attempt with version 1
      const staleRelease = dbStore.releaseCreditHold("ORD-10483", 1);
      expect(staleRelease.success).toBe(false);
      expect(staleRelease.conflict).toBe(true);
    });
  });

  describe("Retailer Alias Auto-Learning (Rule [A20])", () => {
    it("persists auto-learned SKU mappings for a specific retailer", () => {
      // Retailer RET-0001 wrote "ghadi powder" which clerk mapped to SKU-DT-1KG
      const alias1 = dbStore.saveRetailerAlias("RET-0001", "ghadi powder", "SKU-DT-1KG");
      expect(alias1.rawPhrase).toBe("ghadi powder");
      expect(alias1.skuId).toBe("SKU-DT-1KG");
      expect(alias1.timesUsed).toBe(1);

      // Second occurrence increments timesUsed counter
      const alias2 = dbStore.saveRetailerAlias("RET-0001", "ghadi powder", "SKU-DT-1KG");
      expect(alias2.timesUsed).toBe(2);

      // Query retailer aliases
      const aliases = dbStore.getRetailerAliases("RET-0001");
      expect(aliases.length).toBeGreaterThanOrEqual(2); // "biscuit chhota" + "ghadi powder"
      expect(aliases[0].rawPhrase).toBe("ghadi powder"); // highest timesUsed first
    });

    it("keeps aliases scoped strictly per retailer without leaking across accounts", () => {
      dbStore.saveRetailerAlias("RET-0001", "special soap", "SKU-DT-CK250");
      const ret1Aliases = dbStore.getRetailerAliases("RET-0001");
      const ret2Aliases = dbStore.getRetailerAliases("RET-0002");

      expect(ret1Aliases.some((a) => a.rawPhrase === "special soap")).toBe(true);
      expect(ret2Aliases.some((a) => a.rawPhrase === "special soap")).toBe(false);
    });
  });
});
