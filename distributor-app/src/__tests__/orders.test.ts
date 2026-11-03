import { describe, it, expect, beforeEach } from "vitest";
import { dbStore, StoredOrder, StoredOrderItem } from "@/db/store";
import { calculateOrderSummary, InputLineItem } from "@/lib/schemes/engine";

describe("Module 4 - Cart, Ledger Credit Check & Order Placement", () => {
  beforeEach(() => {
    dbStore.reset();
  });

  describe("Standard Wholesale Order Placement within Credit Limit (Rule [A14])", () => {
    it("successfully places order, unlocks free goods, updates ledger balance and deducts warehouse stock", () => {
      const retailer = dbStore.getRetailerById("RET-0001")!;
      expect(retailer).toBeDefined();
      expect(retailer.creditLimit).toBe(50000);
      expect(retailer.currentBalance).toBe(12000);

      const initialBiscuitStock = dbStore.getSkuById("SKU-BS-075")!.stockCases;
      expect(initialBiscuitStock).toBe(340);

      // 1. Calculate order via scheme engine: 10 cases of Glucose biscuits
      const engineInputs: InputLineItem[] = [
        {
          skuId: "SKU-BS-075",
          skuCode: "PARLE-G-75G",
          skuName: "Glucose biscuit 75 g",
          orderedCases: 10,
          dealerPrice: 777.6,
          gstRate: 18,
          schemeType: "FREE_GOODS",
          schemeDetail: { buyQty: 10, getFreeQty: 1 },
        },
      ];

      const summary = calculateOrderSummary(engineInputs);
      expect(summary.totalOrderedCases).toBe(10);
      expect(summary.totalFreeCases).toBe(1);
      expect(summary.totalDeliveredCases).toBe(11);
      expect(summary.grandTotal).toBe(9176);

      // Check credit headroom: 12,000 + 9,176 = 21,176 <= 50,000 (Within limit)
      const projectedBalance = retailer.currentBalance + summary.grandTotal;
      expect(projectedBalance).toBeLessThanOrEqual(retailer.creditLimit);

      // Deduct warehouse stock for ordered + free promotional cases
      const stockDeducted = dbStore.deductSkuStock("SKU-BS-075", summary.totalDeliveredCases);
      expect(stockDeducted).toBe(true);

      const remainingStock = dbStore.getSkuById("SKU-BS-075")!.stockCases;
      expect(remainingStock).toBe(initialBiscuitStock - 11); // 329 cases

      // 2. Persist order
      const orderId = "ORD-2026-0001";
      const orderRecord: StoredOrder = {
        id: orderId,
        retailerId: retailer.id,
        placedBy: "usr_retailer_1",
        status: "PLACED",
        subtotal: summary.totalGrossAmount,
        schemeDiscount: summary.totalDiscountAmount,
        taxableAmount: summary.totalTaxableAmount,
        totalGst: summary.totalGstAmount,
        grandTotal: summary.grandTotal,
        freeGoodsTally: [{ skuId: "SKU-BS-075", skuName: "Glucose biscuit 75 g", freeCases: 1 }],
        occVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const items: StoredOrderItem[] = [
        {
          id: "item_01",
          orderId,
          skuId: "SKU-BS-075",
          skuName: "Glucose biscuit 75 g",
          quantityCases: 10,
          freeCases: 1,
          unitDealerPrice: 777.6,
          discountPct: 0,
          discountAmount: 0,
          netLineAmount: 7776.0,
          gstRate: 18,
          gstAmount: 1399.68,
        },
      ];

      dbStore.createOrder(orderRecord, items);

      // 3. Verify ledger balance updated atomically
      const updatedRetailer = dbStore.getRetailerById("RET-0001")!;
      expect(updatedRetailer.currentBalance).toBe(21176);
      expect(updatedRetailer.lastOrderAt).toBeDefined();

      // 4. Verify order query retrieval
      const fetched = dbStore.getOrderById(orderId);
      expect(fetched).toBeDefined();
      expect(fetched?.order.status).toBe("PLACED");
      expect(fetched?.order.grandTotal).toBe(9176);
      expect(fetched?.items).toHaveLength(1);
    });
  });

  describe("Credit Limit Breaches & CREDIT_HOLD Flag (Rule [A14])", () => {
    it("flags status as CREDIT_HOLD when order exceeds remaining credit headroom", () => {
      const retailer = dbStore.getRetailerById("RET-0001")!;
      // Current balance: 12,000, Credit Limit: 50,000. Available headroom: 38,000.
      // Ordering 20 cases of Detergent powder at ₹2,030 = ₹40,600 ex-GST
      const engineInputs: InputLineItem[] = [
        {
          skuId: "SKU-DT-1KG",
          skuCode: "GHADI-DET-1KG",
          skuName: "Detergent powder 1 kg",
          orderedCases: 20,
          dealerPrice: 2030.0,
          gstRate: 18,
          schemeType: "SLAB_DISCOUNT",
          schemeDetail: { minCases: 5, discountPct: 3 },
        },
      ];

      const summary = calculateOrderSummary(engineInputs);
      // Net with 18% GST is ~₹46,471
      expect(summary.grandTotal).toBeGreaterThan(38000);

      const projectedBalance = retailer.currentBalance + summary.grandTotal;
      const creditExceeded = projectedBalance > retailer.creditLimit;
      expect(creditExceeded).toBe(true);

      const initialStatus: StoredOrder["status"] = creditExceeded ? "CREDIT_HOLD" : "PLACED";
      expect(initialStatus).toBe("CREDIT_HOLD");

      const orderRecord: StoredOrder = {
        id: "ORD-2026-0002",
        retailerId: retailer.id,
        placedBy: "usr_retailer_1",
        status: initialStatus,
        subtotal: summary.totalGrossAmount,
        schemeDiscount: summary.totalDiscountAmount,
        taxableAmount: summary.totalTaxableAmount,
        totalGst: summary.totalGstAmount,
        grandTotal: summary.grandTotal,
        freeGoodsTally: [],
        occVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbStore.createOrder(orderRecord, []);

      const saved = dbStore.getOrderById("ORD-2026-0002");
      expect(saved?.order.status).toBe("CREDIT_HOLD");
    });
  });

  describe("Physical Stock Deductions & Anti-Backorder Guard (Rule [A9])", () => {
    it("prevents stock deduction when requested quantity exceeds warehouse inventory", () => {
      const teaSku = dbStore.getSkuById("SKU-TE-250")!;
      expect(teaSku.stockCases).toBe(0); // Out of stock

      const deducted = dbStore.deductSkuStock("SKU-TE-250", 1);
      expect(deducted).toBe(false);
      expect(teaSku.stockCases).toBe(0); // Never goes negative
    });
  });

  describe("Optimistic Concurrency Control (OCC) on Orders (Rule [A19])", () => {
    it("increments OCC version upon status modification and rejects stale updates", () => {
      const orderRecord: StoredOrder = {
        id: "ORD-2026-0003",
        retailerId: "RET-0001",
        placedBy: "usr_retailer_1",
        status: "CREDIT_HOLD",
        subtotal: 10000,
        schemeDiscount: 0,
        taxableAmount: 10000,
        totalGst: 1800,
        grandTotal: 11800,
        freeGoodsTally: [],
        occVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbStore.createOrder(orderRecord, []);

      // Clerk A verifies order with expected version 1
      const updateResult = dbStore.updateOrderStatus("ORD-2026-0003", "VERIFIED", 1);
      expect(updateResult.success).toBe(true);
      expect(updateResult.order?.occVersion).toBe(2);
      expect(updateResult.order?.status).toBe("VERIFIED");

      // Clerk B attempts to modify with stale version 1 -> rejected with OCC Conflict
      const staleResult = dbStore.updateOrderStatus("ORD-2026-0003", "CANCELLED", 1);
      expect(staleResult.success).toBe(false);
      expect(staleResult.error).toContain("OCC Conflict");
    });
  });
});
