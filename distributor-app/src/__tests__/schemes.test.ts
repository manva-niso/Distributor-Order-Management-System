import { describe, it, expect } from "vitest";
import {
  calculateLineItem,
  calculateOrderSummary,
  roundTo2Decimals,
  InputLineItem,
} from "@/lib/schemes/engine";

describe("Module 3 - Pure Scheme & Pricing Calculation Engine", () => {
  describe("Mathematical Half-Up Rounding Utility (Rule [A2])", () => {
    it("correctly rounds floating point numbers to 2 decimal places", () => {
      expect(roundTo2Decimals(10.125)).toBe(10.13);
      expect(roundTo2Decimals(10.124)).toBe(10.12);
      expect(roundTo2Decimals(777.6 * 9)).toBe(6998.4);
      expect(roundTo2Decimals(0.001)).toBe(0);
    });
  });

  describe("Free Goods Scheme: Buy X Get Y Free (Rule [A11])", () => {
    const biscuitSku: InputLineItem = {
      skuId: "SKU-BS-075",
      skuCode: "PARLE-G-75G",
      skuName: "Glucose biscuit 75 g",
      orderedCases: 0,
      dealerPrice: 777.6,
      gstRate: 18,
      schemeType: "FREE_GOODS",
      schemeDetail: {
        buyQty: 10,
        getFreeQty: 1,
      },
    };

    it("yields 0 free goods when below threshold (9 cases)", () => {
      const line = calculateLineItem({ ...biscuitSku, orderedCases: 9 });
      expect(line.orderedCases).toBe(9);
      expect(line.freeCases).toBe(0);
      expect(line.totalDeliveredCases).toBe(9);
      expect(line.grossAmount).toBe(6998.4);
      expect(line.discountAmount).toBe(0);
      expect(line.taxableAmount).toBe(6998.4);
      expect(line.cgstAmount).toBe(629.86);
      expect(line.sgstAmount).toBe(629.86);
      expect(line.totalGstAmount).toBe(1259.72);
      expect(line.lineTotal).toBe(8258.12);
    });

    it("unlocks 1 free case at threshold (10 cases) delivered at ₹0.00", () => {
      const line = calculateLineItem({ ...biscuitSku, orderedCases: 10 });
      expect(line.orderedCases).toBe(10);
      expect(line.freeCases).toBe(1);
      expect(line.totalDeliveredCases).toBe(11);
      expect(line.grossAmount).toBe(7776.0);
      expect(line.discountAmount).toBe(0);
      expect(line.taxableAmount).toBe(7776.0);
      // GST 18% split 9% CGST + 9% SGST
      expect(line.cgstAmount).toBe(699.84);
      expect(line.sgstAmount).toBe(699.84);
      expect(line.lineTotal).toBe(9175.68);
      expect(line.discountDescription).toContain("Buy 10 Get 1 Free");
    });

    it("correctly computes multiple free goods tiers (25 cases -> 2 free cases)", () => {
      const line = calculateLineItem({ ...biscuitSku, orderedCases: 25 });
      expect(line.orderedCases).toBe(25);
      expect(line.freeCases).toBe(2);
      expect(line.totalDeliveredCases).toBe(27);
      expect(line.grossAmount).toBe(19440.0);
    });
  });

  describe("Slab Tier Cash Discount (Rule [A12])", () => {
    const detergentSku: InputLineItem = {
      skuId: "SKU-DT-1KG",
      skuCode: "GHADI-DET-1KG",
      skuName: "Detergent powder 1 kg",
      orderedCases: 0,
      dealerPrice: 2030.0,
      gstRate: 18,
      schemeType: "SLAB_DISCOUNT",
      schemeDetail: {
        minCases: 5,
        discountPct: 3,
      },
    };

    it("applies 0% discount when under slab threshold (4 cases)", () => {
      const line = calculateLineItem({ ...detergentSku, orderedCases: 4 });
      expect(line.orderedCases).toBe(4);
      expect(line.freeCases).toBe(0);
      expect(line.grossAmount).toBe(8120.0);
      expect(line.discountAmount).toBe(0);
      expect(line.taxableAmount).toBe(8120.0);
      expect(line.cgstAmount).toBe(730.8);
      expect(line.sgstAmount).toBe(730.8);
      expect(line.lineTotal).toBe(9581.6);
    });

    it("applies exactly 3% cash discount at and above slab threshold (5 cases)", () => {
      const line = calculateLineItem({ ...detergentSku, orderedCases: 5 });
      expect(line.orderedCases).toBe(5);
      expect(line.grossAmount).toBe(10150.0);
      // 3% of 10,150 = 304.50
      expect(line.discountAmount).toBe(304.5);
      // Taxable = 10,150 - 304.50 = 9,845.50
      expect(line.taxableAmount).toBe(9845.5);
      // CGST 9% of 9,845.50 = 886.10
      expect(line.cgstAmount).toBe(886.1);
      // SGST 9% of 9,845.50 = 886.10
      expect(line.sgstAmount).toBe(886.1);
      expect(line.totalGstAmount).toBe(1772.2);
      // Line Total = 9,845.50 + 1,772.20 = 11,617.70
      expect(line.lineTotal).toBe(11617.7);
      expect(line.discountDescription).toContain("3% on 5+ cases");
    });
  });

  describe("5% GST Category Item (Tea Leaf)", () => {
    const teaSku: InputLineItem = {
      skuId: "SKU-TE-250",
      skuCode: "WAGH-TEA-250G",
      skuName: "Tea leaf 250 g",
      orderedCases: 2,
      dealerPrice: 4720.0,
      gstRate: 5,
      schemeType: "NONE",
    };

    it("applies 2.5% CGST + 2.5% SGST correctly for 5% GST bracket", () => {
      const line = calculateLineItem(teaSku);
      expect(line.grossAmount).toBe(9440.0);
      expect(line.discountAmount).toBe(0);
      expect(line.taxableAmount).toBe(9440.0);
      expect(line.cgstAmount).toBe(236.0);
      expect(line.sgstAmount).toBe(236.0);
      expect(line.totalGstAmount).toBe(472.0);
      expect(line.lineTotal).toBe(9912.0);
    });
  });

  describe("Order Summary & Cart Aggregation", () => {
    it("accurately computes multi-item composite basket with schemes and GST", () => {
      const basket: InputLineItem[] = [
        {
          skuId: "SKU-BS-075",
          skuCode: "PARLE-G-75G",
          skuName: "Glucose biscuit 75 g",
          orderedCases: 10, // unlocks 1 free case
          dealerPrice: 777.6,
          gstRate: 18,
          schemeType: "FREE_GOODS",
          schemeDetail: { buyQty: 10, getFreeQty: 1 },
        },
        {
          skuId: "SKU-DT-1KG",
          skuCode: "GHADI-DET-1KG",
          skuName: "Detergent powder 1 kg",
          orderedCases: 5, // unlocks 3% discount
          dealerPrice: 2030.0,
          gstRate: 18,
          schemeType: "SLAB_DISCOUNT",
          schemeDetail: { minCases: 5, discountPct: 3 },
        },
      ];

      const summary = calculateOrderSummary(basket);

      expect(summary.totalOrderedCases).toBe(15);
      expect(summary.totalFreeCases).toBe(1);
      expect(summary.totalDeliveredCases).toBe(16);

      // Gross = 7,776.00 + 10,150.00 = 17,926.00
      expect(summary.totalGrossAmount).toBe(17926.0);
      // Discount = 0 + 304.50 = 304.50
      expect(summary.totalDiscountAmount).toBe(304.5);
      // Taxable = 7,776.00 + 9,845.50 = 17,621.50
      expect(summary.totalTaxableAmount).toBe(17621.5);
      // CGST = 699.84 + 886.10 = 1,585.94
      expect(summary.totalCgstAmount).toBe(1585.94);
      // SGST = 699.84 + 886.10 = 1,585.94
      expect(summary.totalSgstAmount).toBe(1585.94);
      // Total GST = 3,171.88
      expect(summary.totalGstAmount).toBe(3171.88);
      // Grand Total = 17,621.50 + 3,171.88 = 20,793.38
      expect(summary.unroundedGrandTotal).toBe(20793.38);
      expect(summary.grandTotal).toBe(20793);
      expect(summary.roundOff).toBe(-0.38);
    });

    it("safely handles empty cart array without errors", () => {
      const summary = calculateOrderSummary([]);
      expect(summary.totalOrderedCases).toBe(0);
      expect(summary.totalFreeCases).toBe(0);
      expect(summary.grandTotal).toBe(0);
      expect(summary.roundOff).toBe(0);
      expect(summary.lines).toHaveLength(0);
    });

    it("clamps negative quantities to 0", () => {
      const item: InputLineItem = {
        skuId: "SKU-BS-075",
        skuCode: "PARLE-G-75G",
        skuName: "Glucose biscuit 75 g",
        orderedCases: -5,
        dealerPrice: 777.6,
        gstRate: 18,
        schemeType: "NONE",
      };

      const line = calculateLineItem(item);
      expect(line.orderedCases).toBe(0);
      expect(line.grossAmount).toBe(0);
      expect(line.lineTotal).toBe(0);
    });
  });
});
