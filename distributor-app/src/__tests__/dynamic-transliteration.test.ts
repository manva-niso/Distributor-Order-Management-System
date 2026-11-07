import { describe, it, expect } from "vitest";
import { transliterateToHindi } from "@/lib/i18n/transliterate";
import { getSkuDisplay, getRetailerDisplay } from "@/lib/i18n/trade-dict";
import { parseSkuRows, parseRetailerRows } from "@/lib/excel/importer";

describe("Dynamic Catalogue & Arbitrary Transliteration Suite", () => {
  it("transliterates arbitrary random grocery products to authentic Hindi", () => {
    const p1 = transliterateToHindi("Kisan Chana Dal 1kg");
    expect(p1).toContain("चना");
    expect(p1).toContain("दाल");
    expect(p1).toContain("किलो");

    const p2 = transliterateToHindi("Everest Garam Masala 100g, case of 48");
    expect(p2).toContain("मसाला");
    expect(p2).toContain("ग्राम");
    expect(p2).toContain("पेटी");

    const p3 = transliterateToHindi("Balaji Wafers 50g");
    expect(p3).toContain("बालाजी");
    expect(p3).toContain("वेफर्स");
  });

  it("transliterates arbitrary random Kirana store names to Devanagari", () => {
    const s1 = transliterateToHindi("Raju Kirana & General Store");
    expect(s1).toContain("राजू");
    expect(s1).toContain("किराना");
    expect(s1).toContain("जनरल");
    expect(s1).toContain("स्टोर");

    const s2 = transliterateToHindi("Mahadev Traders");
    expect(s2).toContain("महादेव");
    expect(s2).toContain("ट्रेडर्स");
  });

  it("getSkuDisplay dynamically transliterates unknown/random SKUs not in seed dictionary", () => {
    const randomSku = {
      id: "SKU-RANDOM-999",
      code: "SKU-RANDOM-999",
      name: "Ambika Toor Dal 2kg",
      brand: "Ambika",
      category: "Flour & Grains",
    };

    const dispHi = getSkuDisplay(randomSku, "hi");
    expect(dispHi.name).toContain("तुअर");
    expect(dispHi.name).toContain("दाल");
    expect(dispHi.name).toContain("किलो");
    expect(dispHi.brand).toBe("अंबिका");
  });

  it("getRetailerDisplay dynamically transliterates unknown/random Kiranas not in seed dictionary", () => {
    const randomRetailer = {
      id: "RET-9999",
      name: "Kanhaiya Daily Needs & Provision",
      ownerName: "Rameshwar Patel",
      route: "Napier Town Route #4",
    };

    const dispHi = getRetailerDisplay(randomRetailer, "hi");
    expect(dispHi.name).toContain("कन्हैया");
    expect(dispHi.name).toContain("डेली");
    expect(dispHi.name).toContain("नीड्स");
    expect(dispHi.name).toContain("प्रोविजन");
    expect(dispHi.ownerName).toContain("पटेल");
    expect(dispHi.route).toBe("नेपियर टाउन रूट #4");
  });

  it("Excel importer auto-populates Devanagari fields for arbitrary custom spreadsheets", () => {
    const customRows = [
      {
        Name: "Vimal Tea Special 250g",
        Brand: "Vimal",
        Category: "Tea",
        PackSize: "250g",
        UnitsPerCase: 32,
        DealerPrice: 800,
        StockCases: 20,
      },
    ];

    const { skus } = parseSkuRows(customRows);
    expect(skus.length).toBe(1);
    expect(skus[0].nameHi).toBeDefined();
    expect(skus[0].nameHi).toContain("चाय");
    expect(skus[0].brandHi).toBe("विमल");
  });
});
