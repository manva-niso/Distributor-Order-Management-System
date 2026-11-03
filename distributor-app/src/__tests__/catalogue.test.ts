import { describe, it, expect, beforeEach } from "vitest";
import { dbStore } from "@/db/store";
import { calculateLineItem, calculateCartTotals, CartItem } from "@/lib/catalogue/cart-store";
import { SEED_SKUS } from "@/db/seed-data";

describe("Module 2 - Retailer Catalogue, Pricing & Stock Suite", () => {
  beforeEach(() => {
    dbStore.reset();
  });

  describe("Catalogue Master Inventory", () => {
    it("loads all seeded SKUs with correct wholesale case packs", () => {
      const skus = dbStore.getAllSkus();
      expect(skus.length).toBeGreaterThanOrEqual(12);

      const biscuit = skus.find((s) => s.code === "SKU-BS-075");
      expect(biscuit).toBeDefined();
      expect(biscuit?.name).toContain("Glucose biscuit 75 g");
      expect(biscuit?.unitsPerCase).toBe(96);
      expect(biscuit?.dealerPrice).toBe(777.60);
      expect(biscuit?.stockCases).toBe(340);
      expect(biscuit?.gstRate).toBe(18.0);
    });

    it("verifies out-of-stock SKU has exactly 0 cases in stock", () => {
      const tea = dbStore.getSkuByCode("SKU-TE-250");
      expect(tea).toBeDefined();
      expect(tea?.stockCases).toBe(0);
      expect(tea?.dealerPrice).toBe(4720.00);
      expect(tea?.gstRate).toBe(5.0);
    });
  });

  describe("Wholesale Case & Free Goods Calculations", () => {
    const biscuitSku = SEED_SKUS.find((s) => s.code === "SKU-BS-075")!;

    it("calculates zero free cases when quantity is under 10 cases", () => {
      const cartItem: CartItem = { ...biscuitSku, quantityCases: 5 };
      const calc = calculateLineItem(cartItem);

      expect(calc.grossAmount).toBe(3888.00); // 5 * 777.60
      expect(calc.freeCases).toBe(0);
      expect(calc.discountAmount).toBe(0);
      expect(calc.taxableAmount).toBe(3888.00);
      expect(calc.gstAmount).toBe(699.84); // 3888 * 0.18
      expect(calc.totalAmount).toBe(4587.84);
    });

    it("unlocks 1 free case when ordering exactly 10 cases (Buy 10 Get 1)", () => {
      const cartItem: CartItem = { ...biscuitSku, quantityCases: 10 };
      const calc = calculateLineItem(cartItem);

      expect(calc.grossAmount).toBe(7776.00); // 10 * 777.60
      expect(calc.freeCases).toBe(1);
      expect(calc.freeCasesValue).toBe(777.60);
      expect(calc.taxableAmount).toBe(7776.00); // Free goods do not inflate taxable bill
      expect(calc.gstAmount).toBe(1399.68); // 7776 * 0.18
      expect(calc.totalAmount).toBe(9175.68);
    });

    it("scales free goods stepped floor division (23 cases = 2 free cases)", () => {
      const cartItem: CartItem = { ...biscuitSku, quantityCases: 23 };
      const calc = calculateLineItem(cartItem);

      expect(calc.freeCases).toBe(2);
      expect(calc.freeCasesValue).toBe(1555.20); // 2 * 777.60
    });
  });

  describe("Slab Discount Calculations", () => {
    const detergentSku = SEED_SKUS.find((s) => s.code === "SKU-DT-1KG")!;

    it("applies zero discount when quantity is 4 cases (< 5 cases threshold)", () => {
      const cartItem: CartItem = { ...detergentSku, quantityCases: 4 };
      const calc = calculateLineItem(cartItem);

      expect(calc.grossAmount).toBe(8120.00); // 4 * 2030
      expect(calc.discountPct).toBe(0);
      expect(calc.discountAmount).toBe(0);
      expect(calc.taxableAmount).toBe(8120.00);
      expect(calc.gstAmount).toBe(1461.60); // 8120 * 0.18
      expect(calc.totalAmount).toBe(9581.60);
    });

    it("applies 3% wholesale discount on 5 cases (threshold unlocked)", () => {
      const cartItem: CartItem = { ...detergentSku, quantityCases: 5 };
      const calc = calculateLineItem(cartItem);

      expect(calc.grossAmount).toBe(10150.00); // 5 * 2030
      expect(calc.discountPct).toBe(3);
      expect(calc.discountAmount).toBe(304.50); // 10150 * 0.03
      expect(calc.taxableAmount).toBe(9845.50); // 10150 - 304.50
      expect(calc.gstAmount).toBe(1772.19); // 9845.50 * 0.18
      expect(calc.totalAmount).toBe(11617.69);
    });
  });

  describe("Combined Multi-SKU Cart Aggregations", () => {
    it("correctly aggregates sample order (10 Biscuit + 4 Detergent)", () => {
      const biscuitSku = SEED_SKUS.find((s) => s.code === "SKU-BS-075")!;
      const detergentSku = SEED_SKUS.find((s) => s.code === "SKU-DT-1KG")!;

      const items: CartItem[] = [
        { ...biscuitSku, quantityCases: 10 },
        { ...detergentSku, quantityCases: 4 },
      ];

      const totals = calculateCartTotals(items);

      expect(totals.itemCount).toBe(2);
      expect(totals.totalCases).toBe(14); // 10 + 4
      expect(totals.totalFreeCases).toBe(1); // 1 free biscuit case
      expect(totals.grossSubtotal).toBe(15896.00); // 7776 + 8120
      expect(totals.totalDiscounts).toBe(0); // Detergent qty 4 didn't hit 5
      expect(totals.taxableSubtotal).toBe(15896.00);
      expect(totals.totalGst).toBe(2861.28); // 15896 * 0.18
      expect(totals.grandTotal).toBe(18757.28);
      expect(totals.totalSavings).toBe(777.60); // Value of 1 free case
    });
  });
});
