import { describe, it, expect } from "vitest";
import {
  normalizeNumerals,
  splitOrderTextIntoLines,
  parseSingleUtterance,
  DeterministicTextParserPipeline,
  deterministicTextParser,
} from "../ai/text-parser";
import { SEED_SKUS } from "../data/catalog";
import { getActiveParserPipeline } from "../ai/pipeline";

describe("Module 5 - Multilingual FMCG Order Text Parser Suite", () => {

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
      const skus = SEED_SKUS;
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
      const skus = SEED_SKUS;
      const line = parseSingleUtterance("2 cases detergent powder 1kg", skus);

      expect(line.extractedQty).toBe(2);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.brand).toBe("Ghadi");
      expect(line.isAmbiguous).toBe(false);
      expect(line.resolvedQtyCases).toBe(2);
    });

    it("parses Devanagari Hindi text with Devanagari numerals and Hindi units", () => {
      const skus = SEED_SKUS;
      const line = parseSingleUtterance("५ पेटी पारले बिस्कुट छोटा", skus);

      expect(line.extractedQty).toBe(5);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.code).toBe("SKU-BS-075");
      expect(line.isAmbiguous).toBe(false);
    });

    it("resolves written number words in Hinglish and English", () => {
      const skus = SEED_SKUS;
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

  describe("Jabalpur Regional FMCG Vernacular & Dialect Suite", () => {
    it("recognizes 'pila wala' as Parle-G 75g (Tier 0 Alias)", () => {
      const line = parseSingleUtterance("3 peti pila wala", SEED_SKUS);
      expect(line.matchedSku?.code).toBe("SKU-BS-075");
      expect(line.extractedQty).toBe(3);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.confidence).toBeGreaterThanOrEqual(0.85);
      expect(line.isAmbiguous).toBe(false);
    });

    it("recognizes 'shakti chai' as Tata Tea Gold 500g", () => {
      const line = parseSingleUtterance("2 peti shakti chai bhejo", SEED_SKUS);
      expect(line.matchedSku?.code).toBe("SKU-TE-TT500");
      expect(line.extractedQty).toBe(2);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.isAmbiguous).toBe(false);
    });

    it("recognizes 'surajmukhi tel' and 'chidiya tel' as Fortune Sunflower Oil", () => {
      const line1 = parseSingleUtterance("5 case surajmukhi tel", SEED_SKUS);
      expect(line1.matchedSku?.code).toBe("SKU-OL-FT1L");
      expect(line1.extractedQty).toBe(5);

      const line2 = parseSingleUtterance("4 peti chidiya tel", SEED_SKUS);
      expect(line2.matchedSku?.code).toBe("SKU-OL-FT1L");
      expect(line2.extractedQty).toBe(4);
    });

    it("recognizes 'kapde dhone wala ghadi' as Ghadi Detergent Powder 1kg", () => {
      const line = parseSingleUtterance("sethji 6 peti kapde dhone wala ghadi", SEED_SKUS);
      expect(line.matchedSku?.code).toBe("SKU-DT-1KG");
      expect(line.extractedQty).toBe(6);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.isAmbiguous).toBe(false);
    });

    it("recognizes 'bartan bar' and 'ghadi tikiya' as Ghadi Detergent Cake", () => {
      const line = parseSingleUtterance("2 peti bartan bar", SEED_SKUS);
      expect(line.matchedSku?.code).toBe("SKU-DT-CK250");
      expect(line.extractedQty).toBe(2);
      expect(line.extractedUnit).toBe("CASE");
    });

    it("resolves fractional weights: aadha (0.5), derh (1.5), dhai (2.5), sawa (1.25)", () => {
      const halfLine = parseSingleUtterance("aadha peti surf excel", SEED_SKUS);
      expect(halfLine.extractedQty).toBe(0.5);

      const oneAndHalf = parseSingleUtterance("derh peti good day", SEED_SKUS);
      expect(oneAndHalf.extractedQty).toBe(1.5);
      expect(oneAndHalf.matchedSku?.code).toBe("SKU-BS-GD120");

      const twoAndHalf = parseSingleUtterance("dhai peti dettol soap", SEED_SKUS);
      expect(twoAndHalf.extractedQty).toBe(2.5);
      expect(twoAndHalf.matchedSku?.code).toBe("SKU-PC-DT125");
    });

    it("resolves darjan (12) and dozen as numeric 12", () => {
      const line = parseSingleUtterance("ek darjan packet good day", SEED_SKUS);
      expect(line.extractedQty).toBe(12);
      expect(line.extractedUnit).toBe("PACK");
    });
  });

  describe("The 'Dabba' Semantic Ambiguity Guardrail (Invariant [A16] 'Ask, Never Guess')", () => {
    it("flags '2 dabba parle g pila wala' as AMBIGUOUS_UNIT rather than silently assuming CASE", () => {
      const line = parseSingleUtterance("2 dabba parle g pila wala", SEED_SKUS);

      expect(line.extractedQty).toBe(2);
      expect(line.extractedUnit).toBe("DABBA");
      expect(line.matchedSku?.code).toBe("SKU-BS-075");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("AMBIGUOUS_UNIT");
      // Calibrated confidence stays <= 0.70 to trigger the disambiguation card
      expect(line.confidence).toBeLessThanOrEqual(0.70);
    });

    it("flags Devanagari '३ डिब्बा फॉर्च्यून तेल' as AMBIGUOUS_UNIT", () => {
      const line = parseSingleUtterance("३ डिब्बा फॉर्च्यून तेल", SEED_SKUS);

      expect(line.extractedQty).toBe(3);
      expect(line.extractedUnit).toBe("DABBA");
      expect(line.matchedSku?.code).toBe("SKU-OL-FT1L");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("AMBIGUOUS_UNIT");
    });
  });

  describe("Unit Ambiguity Guardrail (Rule [A16])", () => {
    it("flags item as ambiguous when unit is missing (e.g., '5 biscuit chhota')", () => {
      const skus = SEED_SKUS;
      const line = parseSingleUtterance("5 biscuit chhota", skus);

      expect(line.extractedQty).toBe(5);
      expect(line.extractedUnit).toBe("UNKNOWN");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("MISSING_UNIT");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.code).toBe("SKU-BS-075");
    });

    it("converts loose retail packets into wholesale case multiples when specified as pack", () => {
      const skus = SEED_SKUS;
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
      const skus = SEED_SKUS;
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
      const skus = SEED_SKUS;
      const line = parseSingleUtterance("15 out of 20 pack detergent powder 1kg", skus);

      expect(line.extractedQty).toBe(15);
      expect(line.extractedUnit).toBe("PACK");
      expect(line.matchedSku?.code).toBe("SKU-DT-1KG");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("BROKEN_CASE");
      expect(line.brokenCaseInfo?.requestedPacks).toBe(15);
    });

    it("flags broken case when loose packet quantity is less than full case capacity", () => {
      const skus = SEED_SKUS;
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

    it("parses descriptive explanatory clauses like '1 pkt of tea, where a case contains 24 pkts'", () => {
      const skus = SEED_SKUS;
      const line = parseSingleUtterance("1 pkt of tea, where a case contains 24 pkts", skus);

      expect(line.extractedQty).toBe(1);
      expect(line.extractedUnit).toBe("PACK");
      expect(line.matchedSku).not.toBeNull();
      expect(line.matchedSku?.category.toLowerCase()).toBe("tea");
      expect(line.resolvedQtyPacks).toBe(1);
      expect(line.brokenCaseInfo?.caseCapacity).toBe(24);
      expect(line.brokenCaseInfo?.requestedPacks).toBe(1);
    });

    it("matches single colloquial product tokens reliably", () => {
      const skus = SEED_SKUS;
      const teaLine = parseSingleUtterance("1 pkt of tea", skus);
      expect(teaLine.matchedSku).not.toBeNull();
      expect(teaLine.matchedSku?.category.toLowerCase()).toBe("tea");

      const soapLine = parseSingleUtterance("2 sabun", skus);
      expect(soapLine.matchedSku).not.toBeNull();

      const biscuitLine = parseSingleUtterance("5 biscuit", skus);
      expect(biscuitLine.matchedSku).not.toBeNull();
      expect(biscuitLine.matchedSku?.category.toLowerCase()).toBe("biscuits");
    });
  });

  describe("Tier 0 Merchant Alias Table & Dynamic Retailer Context", () => {
    it("allows dynamic per-retailer alias override passed in context", () => {
      const customAliases = {
        "apna biscuit": "SKU-BS-GD120", // Store nickname for Good Day
      };
      const line = parseSingleUtterance("5 peti apna biscuit", SEED_SKUS, customAliases);
      expect(line.matchedSku?.code).toBe("SKU-BS-GD120");
      expect(line.confidence).toBeGreaterThanOrEqual(0.85);
      expect(line.isAmbiguous).toBe(false);
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
