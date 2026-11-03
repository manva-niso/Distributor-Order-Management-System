import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeNumerals,
  splitOrderTextIntoLines,
  parseSingleUtterance,
  DeterministicTextParserPipeline,
  deterministicTextParser,
} from "@/lib/ai/text-parser";
import { dbStore } from "@/db/store";
import { getActiveParserPipeline } from "@/lib/ai/pipeline";

describe("Module 5 - Multilingual FMCG Order Text Parser Suite", () => {
  beforeEach(() => {
    dbStore.reset();
  });

  describe("Devanagari Numerals & String Normalization", () => {
    it("converts Devanagari numerals to standard Arabic digits", () => {
      expect(normalizeNumerals("५ पेटी पारले")).toBe("5 पेटी पारले");
      expect(normalizeNumerals("१० पैकेट")).toBe("10 पैकेट");
      expect(normalizeNumerals("१२३४५६७८९०")).toBe("1234567890");
    });

    it("splits multi-line and delimited order utterances into individual items", () => {
      const rawText = "5 peti biscuit chhota\n2 peti ghadi powder 1 kg\n1 peti chai wagh bakri 250";
      const lines = splitOrderTextIntoLines(rawText);
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("5 peti biscuit chhota");
      expect(lines[1]).toBe("2 peti ghadi powder 1 kg");
      expect(lines[2]).toBe("1 peti chai wagh bakri 250");
    });

    it("splits orders delimited by commas, plus signs, and Hindi 'aur'", () => {
      const rawText = "5 peti biscuit chhota, 2 peti ghadi powder aur 3 case tea";
      const lines = splitOrderTextIntoLines(rawText);
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Hinglish, English, and Hindi Item Extraction", () => {
    it("parses Hinglish order line with quantity, unit (peti), and SKU", () => {
      const skus = dbStore.getAllSkus();
      const line = parseSingleUtterance("bhaiya 5 peti biscuit chhota jaldi bhejo", skus);

      expect(line.extractedQty).toBe(5);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.code).toBe("SKU-BS-075");
      expect(line.isAmbiguous).toBe(false);
      expect(line.resolvedQtyCases).toBe(5);
      expect(line.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("parses pure English order with standard case units", () => {
      const skus = dbStore.getAllSkus();
      const line = parseSingleUtterance("2 cases detergent powder 1kg", skus);

      expect(line.extractedQty).toBe(2);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.brand).toBe("Ghadi");
      expect(line.isAmbiguous).toBe(false);
      expect(line.resolvedQtyCases).toBe(2);
    });

    it("parses Devanagari Hindi text with Devanagari numerals and Hindi units", () => {
      const skus = dbStore.getAllSkus();
      const line = parseSingleUtterance("५ पेटी पारले बिस्कुट छोटा", skus);

      expect(line.extractedQty).toBe(5);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.code).toBe("SKU-BS-075");
      expect(line.isAmbiguous).toBe(false);
    });

    it("resolves written number words in Hinglish and English", () => {
      const skus = dbStore.getAllSkus();
      const hinglishLine = parseSingleUtterance("do peti biscuit chhota", skus);
      expect(hinglishLine.extractedQty).toBe(2);
      expect(hinglishLine.extractedUnit).toBe("CASE");

      const englishLine = parseSingleUtterance("three boxes wagh bakri tea", skus);
      expect(englishLine.extractedQty).toBe(3);
      expect(englishLine.extractedUnit).toBe("CASE");
      expect(englishLine.matchedSku?.brand).toBe("Wagh Bakri");

      const hindiLine = parseSingleUtterance("चार पेटी चाय", skus);
      expect(hindiLine.extractedQty).toBe(4);
      expect(hindiLine.extractedUnit).toBe("CASE");
    });
  });

  describe("Unit Ambiguity Guardrail (Rule [A16])", () => {
    it("flags item as ambiguous when unit is missing (e.g., '5 biscuit chhota')", () => {
      const skus = dbStore.getAllSkus();
      const line = parseSingleUtterance("5 biscuit chhota", skus);

      expect(line.extractedQty).toBe(5);
      expect(line.extractedUnit).toBe("UNKNOWN");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("MISSING_UNIT");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.code).toBe("SKU-BS-075");
    });

    it("converts loose retail packets into wholesale case multiples when specified as pack", () => {
      const skus = dbStore.getAllSkus();
      // SKU-BS-075 has 96 units per case. 120 packets = ceil(120/96) = 2 cases
      const line = parseSingleUtterance("120 packet biscuit chhota", skus);

      expect(line.extractedQty).toBe(120);
      expect(line.extractedUnit).toBe("PACK");
      expect(line.isAmbiguous).toBe(false);
      expect(line.resolvedQtyCases).toBe(2);
    });
  });

  describe("Broken Case & Partial Case Request Detection (Rule [A36])", () => {
    it("handles colloquial cut-pack request 'detergent powder of 1 kg case of 20 mai se 15 dedo'", () => {
      const skus = dbStore.getAllSkus();
      const line = parseSingleUtterance("detergent powder of 1 kg case of 20 mai se 15 dedo", skus);

      expect(line.extractedQty).toBe(15);
      expect(line.extractedUnit).toBe("PACK");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.code).toBe("SKU-DT-1KG");
      expect(line.matchedSku?.brand).toBe("Ghadi");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("BROKEN_CASE");
      expect(line.brokenCaseInfo).toBeDefined();
      expect(line.brokenCaseInfo?.requestedPacks).toBe(15);
      expect(line.brokenCaseInfo?.caseCapacity).toBe(20);
      expect(line.brokenCaseInfo?.fullCaseRoundUp).toBe(1);
      expect(line.brokenCaseInfo?.fullCasePrice).toBe(2030);
      expect(line.brokenCaseInfo?.loosePackPrice).toBe(101.5);
    });

    it("handles English partial case '15 out of 20 pack detergent powder 1kg'", () => {
      const skus = dbStore.getAllSkus();
      const line = parseSingleUtterance("15 out of 20 pack detergent powder 1kg", skus);

      expect(line.extractedQty).toBe(15);
      expect(line.extractedUnit).toBe("PACK");
      expect(line.matchedSku?.code).toBe("SKU-DT-1KG");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("BROKEN_CASE");
      expect(line.brokenCaseInfo?.requestedPacks).toBe(15);
    });

    it("flags broken case when loose packet quantity is less than full case capacity", () => {
      const skus = dbStore.getAllSkus();
      // SKU-DT-1KG capacity is 20. Retailer orders 10 packets.
      const line = parseSingleUtterance("10 packet detergent powder 1kg", skus);

      expect(line.extractedQty).toBe(10);
      expect(line.extractedUnit).toBe("PACK");
      expect(line.matchedSku?.code).toBe("SKU-DT-1KG");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("BROKEN_CASE");
      expect(line.brokenCaseInfo?.requestedPacks).toBe(10);
      expect(line.brokenCaseInfo?.caseCapacity).toBe(20);
    });
  });

  describe("Pipeline Interface & Deterministic Parser", () => {
    it("runs full DeterministicTextParserPipeline on multi-line text", async () => {
      const text = `bhaiya 5 peti biscuit chhota
2 peti ghadi powder 1 kg
1 peti chai wagh bakri 250
10 biscuit`; // 10 biscuit is ambiguous (missing unit)

      const result = await deterministicTextParser.parseText(text);

      expect(result.success).toBe(true);
      expect(result.totalLines).toBe(4);
      expect(result.ambiguousCount).toBe(1); // line 4 is ambiguous
      expect(result.lines[0].matchedSku?.code).toBe("SKU-BS-075");
      expect(result.lines[0].resolvedQtyCases).toBe(5);
      expect(result.lines[3].isAmbiguous).toBe(true);
      expect(result.lines[3].ambiguityReason).toBe("MISSING_UNIT");
    });

    it("getActiveParserPipeline returns deterministic pipeline by default", () => {
      const pipeline = getActiveParserPipeline();
      expect(pipeline.name).toBe("rules_deterministic");
    });
  });
});
