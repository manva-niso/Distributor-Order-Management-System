import { describe, it, expect } from "vitest";
import { fmcgKnowledgeGraph } from "@/lib/ai/knowledge-graph";
import { SEED_SKUS } from "@/db/seed-data";
import { parseSingleUtterance } from "@/lib/ai/text-parser";

describe("FMCG Trade Knowledge Graph & Semantic Suggestions (Rule [A61])", () => {
  it("maps 'सर्फ' (laundry detergent) to Detergent SKUs, NEVER biscuits", () => {
    const suggestions = fmcgKnowledgeGraph.getSmartSuggestions({
      rawUtterance: "1 kg सर्फ",
      catalog: SEED_SKUS,
      topK: 3,
    });

    expect(suggestions.isCategorized).toBe(true);
    expect(suggestions.categoryNode.category).toBe("LAUNDRY_DETERGENT");
    expect(suggestions.candidates.length).toBeGreaterThan(0);

    const categories = suggestions.candidates.map((c) => c.sku.category);
    expect(categories.every((cat) => cat.toLowerCase().includes("detergent"))).toBe(true);
    // Explicitly verify no biscuits are suggested!
    expect(categories.some((cat) => cat.toLowerCase().includes("biscuit"))).toBe(false);
  });

  it("maps 'नहाने की साबुन' (bathing soap) to Personal Care SKUs, NEVER biscuits", () => {
    const suggestions = fmcgKnowledgeGraph.getSmartSuggestions({
      rawUtterance: "1 packet नहाने की साबुन",
      catalog: SEED_SKUS,
      topK: 3,
    });

    expect(suggestions.isCategorized).toBe(true);
    expect(suggestions.categoryNode.category).toBe("TOILET_SOAP");
    expect(suggestions.candidates.length).toBeGreaterThan(0);

    const names = suggestions.candidates.map((c) => c.sku.name.toLowerCase());
    expect(names.some((n) => n.includes("dettol") || n.includes("lifebuoy"))).toBe(true);
    expect(names.some((n) => n.includes("biscuit") || n.includes("cookies"))).toBe(false);
  });

  it("maps 'बर्तन की साबुन' (dishwash soap) to Home Care / Detergent Cake", () => {
    const suggestions = fmcgKnowledgeGraph.getSmartSuggestions({
      rawUtterance: "2 packet बर्तन की साबुन",
      catalog: SEED_SKUS,
      topK: 3,
    });

    expect(suggestions.isCategorized).toBe(true);
    expect(suggestions.categoryNode.category).toBe("DISHWASH");
    expect(suggestions.candidates.length).toBeGreaterThan(0);
  });

  it("detects automotive parts (cycle tyre tube) and returns 0 fake FMCG candidates", () => {
    const suggestions = fmcgKnowledgeGraph.getSmartSuggestions({
      rawUtterance: "3 peti cycle tyre tube",
      catalog: SEED_SKUS,
      topK: 3,
    });

    expect(suggestions.categoryNode.category).toBe("AUTOMOTIVE_HARDWARE");
    expect(suggestions.categoryNode.isDistributedByCompanyA).toBe(false);
    expect(suggestions.candidates.length).toBe(0);
    expect(suggestions.explanation.toLowerCase()).toContain("automotive");
  });

  it("end-to-end: parseSingleUtterance resolves category intent to Personal Care, never biscuits", () => {
    const parsed = parseSingleUtterance("1 packet नहाने की साबुन", SEED_SKUS);

    // Either matched to a personal care soap or candidate set contains personal care soaps
    const resolvedCategory = parsed.matchedSku?.category || parsed.candidates[0]?.sku.category;
    expect(resolvedCategory?.toLowerCase()).toContain("personal care");
    expect(resolvedCategory?.toLowerCase()).not.toContain("biscuit");
  });
});
