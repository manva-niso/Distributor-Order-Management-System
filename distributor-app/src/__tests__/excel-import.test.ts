import { describe, it, expect, beforeEach } from "vitest";
import {
  generateExcelTemplate,
  parseWorkbookBuffer,
  parseSkuRows,
  parseRetailerRows,
} from "@/lib/excel/importer";
import { dbStore } from "@/db/store";

describe("Dynamic Master Data & Excel Ingestion Engine", () => {
  beforeEach(() => {
    dbStore.reset();
  });

  describe("Excel Template Generation", () => {
    it("generates valid master workbook buffer containing both SKUs and Retailers sheets", () => {
      const buffer = generateExcelTemplate("master");
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000); // Standard XLSX header is > 1KB
    });
  });

  describe("Workbook Parsing & Extraction", () => {
    it("parses generated template buffer back into typed SKUs and Retailers", () => {
      const buffer = generateExcelTemplate("master");
      const result = parseWorkbookBuffer(buffer);

      expect(result.success).toBe(true);
      expect(result.skus.length).toBeGreaterThanOrEqual(3);
      expect(result.retailers.length).toBeGreaterThanOrEqual(3);

      // Verify SKU Parle-G
      const biscuit = result.skus.find((s) => s.code === "SKU-BS-075");
      expect(biscuit).toBeDefined();
      expect(biscuit?.dealerPrice).toBe(777.6);
      expect(biscuit?.unitsPerCase).toBe(96);
      expect(biscuit?.packPrice).toBe(8.1);
      expect(biscuit?.schemeType).toBe("FREE_GOODS");
      expect(biscuit?.schemeDetail?.buyQty).toBe(10);
      expect(biscuit?.schemeDetail?.getFreeQty).toBe(1);

      // Verify Retailer Ramesh Sharma
      const retailer = result.retailers.find((r) => r.phone === "9826000001");
      expect(retailer).toBeDefined();
      expect(retailer?.name).toBe("Sharma Kirana Store");
      expect(retailer?.route).toBe("Napier Town Route #4");
      expect(retailer?.creditLimit).toBe(50000);
    });

    it("gracefully handles custom raw SKU rows with missing or case-insensitive headers", () => {
      const rawRows = [
        {
          "Product Name": "Britannia Treat Biscuit 100g",
          "Company": "Britannia",
          "Category": "Biscuits",
          "Case Pack": 48,
          "Wholesale Price": 1200.0,
          "Stock": 75,
          "GST %": 18,
          "Offer": "Buy 10 Get 1 Free",
        },
      ];

      const { skus, errors } = parseSkuRows(rawRows);
      expect(errors).toHaveLength(0);
      expect(skus).toHaveLength(1);
      expect(skus[0].name).toBe("Britannia Treat Biscuit 100g");
      expect(skus[0].brand).toBe("Britannia");
      expect(skus[0].dealerPrice).toBe(1200);
      expect(skus[0].unitsPerCase).toBe(48);
      expect(skus[0].packPrice).toBe(25);
      expect(skus[0].schemeType).toBe("FREE_GOODS");
    });
  });

  describe("Store Ingestion & Dynamic Replacement", () => {
    it("allows replacing catalog with newly imported SKUs dynamically", () => {
      const initialStats = dbStore.getStoreStats();
      expect(initialStats.totalSkus).toBeGreaterThan(0);

      const customSkus = [
        {
          id: "CUSTOM-01",
          code: "CUSTOM-01",
          name: "Local Basmati Rice 25 kg Bag",
          brand: "Jabalpur Mills",
          category: "Staples",
          packSize: "25 kg",
          unitsPerCase: 1,
          dealerPrice: 2200.0,
          packPrice: 2200.0,
          stockCases: 100,
          hsnCode: "10063020",
          gstRate: 5.0,
          schemeType: "NONE" as const,
          active: true,
        },
      ];

      dbStore.importSkus(customSkus, "replace");

      const updatedStats = dbStore.getStoreStats();
      expect(updatedStats.totalSkus).toBe(1);

      const retrieved = dbStore.getSkuById("CUSTOM-01");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Local Basmati Rice 25 kg Bag");
      expect(retrieved?.dealerPrice).toBe(2200);
    });
  });
});
