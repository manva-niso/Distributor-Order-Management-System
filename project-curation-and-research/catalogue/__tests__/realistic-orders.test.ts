import { describe, it, expect } from "vitest";
import { REALISTIC_ORDER_SCENARIOS } from "../datasets/realistic-orders";
import { REAL_FMCG_CATALOG } from "../catalog-data";
import { buildCatalogAliasMap } from "../index";
import { CascadedOrderParserPipeline } from "../../../engine/src/ai/cascaded-parser";

describe("Real-World FMCG Wholesale Order Benchmark Suite", () => {
  const catalogAliases = buildCatalogAliasMap(REAL_FMCG_CATALOG);
  const parser = new CascadedOrderParserPipeline();
  const context = {
    availableSkus: REAL_FMCG_CATALOG as any,
    retailerAliases: catalogAliases,
  };

  it("Scenario 1: Daily WhatsApp order with mixed Hinglish & courteous pleasantries", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-01-DAILY-WHATSAPP")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.success).toBe(true);
    expect(result.lines).toHaveLength(3);

    // 10 peti pila wala -> Parle-G 75g
    const l1 = result.lines[0];
    expect(l1.extractedQty).toBe(10);
    expect(l1.extractedUnit).toBe("CASE");
    expect(l1.matchedSku?.code).toBe("SKU-BS-PG075");
    expect(l1.confidence).toBeGreaterThanOrEqual(0.90);

    // 2 peti shakti chai 500g -> Tata Tea Gold 500g
    const l2 = result.lines[1];
    expect(l2.extractedQty).toBe(2);
    expect(l2.matchedSku?.code).toBe("SKU-TE-TT500");
    expect(l2.confidence).toBeGreaterThanOrEqual(0.85);

    // 3 peti kapde dhone wala ghadi 1kg -> Ghadi Detergent 1kg
    const l3 = result.lines[2];
    expect(l3.extractedQty).toBe(3);
    expect(l3.matchedSku?.code).toBe("SKU-DT-GH1KG");
    expect(l3.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it("Scenario 2: The 'Dabba' Semantic Dilemma flags AMBIGUOUS_UNIT for both oil and biscuits", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-02-DABBA-POLYSEMY")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(2);

    for (const line of result.lines) {
      expect(line.extractedUnit).toBe("DABBA");
      expect(line.isAmbiguous).toBe(true);
      expect(line.ambiguityReason).toBe("AMBIGUOUS_UNIT");
      expect(line.confidence).toBeLessThanOrEqual(0.70);
    }
  });

  it("Scenario 3: Broken Case requests are flagged with BROKEN_CASE and exact pack counts", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-03-BROKEN-CASE")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(2);

    // 15 packets out of case of 20
    const l1 = result.lines[0];
    expect(l1.extractedQty).toBe(15);
    expect(l1.extractedUnit).toBe("PACK");
    expect(l1.isAmbiguous).toBe(true);
    expect(l1.ambiguityReason).toBe("BROKEN_CASE");
    expect(l1.brokenCaseInfo?.requestedPacks).toBe(15);
    expect(l1.brokenCaseInfo?.fullCaseRoundUp).toBe(1);

    // 10 packets out of case of 36
    const l2 = result.lines[1];
    expect(l2.extractedQty).toBe(10);
    expect(l2.extractedUnit).toBe("PACK");
    expect(l2.isAmbiguous).toBe(true);
    expect(l2.ambiguityReason).toBe("BROKEN_CASE");
    expect(l2.brokenCaseInfo?.requestedPacks).toBe(10);
  });

  it("Scenario 4: Fractional vernacular weights and 'darjan' multipliers parse accurately", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-04-FRACTIONAL-WEIGHTS")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(3);

    // aadha peti -> 0.5
    expect(result.lines[0].extractedQty).toBe(0.5);
    expect(result.lines[0].matchedSku?.code).toBe("SKU-BS-GD120");

    // derh peti -> 1.5
    expect(result.lines[1].extractedQty).toBe(1.5);
    expect(result.lines[1].matchedSku?.code).toBe("SKU-OL-FT1L");

    // do darjan -> 24 packs
    expect(result.lines[2].extractedQty).toBe(24);
    expect(result.lines[2].extractedUnit).toBe("PACK");
    expect(result.lines[2].matchedSku?.code).toBe("SKU-FD-MG070");
  });

  it("Scenario 5: Pure Hindi Devanagari script order parses with Arabic digits and matched SKUs", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-05-HINDI-DEVANAGARI")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(4);

    expect(result.lines[0].extractedQty).toBe(5);
    expect(result.lines[0].matchedSku?.code).toBe("SKU-BS-PG075");

    expect(result.lines[1].extractedQty).toBe(2);
    expect(result.lines[1].matchedSku?.code).toBe("SKU-DT-GH1KG");

    expect(result.lines[2].extractedQty).toBe(3);
    expect(result.lines[2].matchedSku?.code).toBe("SKU-PC-DT125");

    expect(result.lines[3].extractedQty).toBe(1);
    expect(result.lines[3].matchedSku?.code).toBe("SKU-FD-TS1KG");
  });

  it("Scenario 6: Spoken phone call / audio transcription cleans conversation noise", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-06-VOICE-CALL-TRANSCRIPTION")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(3);

    // 5 peti chhota glucose biskut -> Parle-G 75g
    expect(result.lines[0].extractedQty).toBe(5);
    expect(result.lines[0].matchedSku?.code).toBe("SKU-BS-PG075");

    // 4 peti lal sabun lifebuoy -> Lifebuoy 100g
    expect(result.lines[1].extractedQty).toBe(4);
    expect(result.lines[1].matchedSku?.code).toBe("SKU-PC-LB100");

    // 2 peti bada surf excel -> Surf Excel 1kg
    expect(result.lines[2].extractedQty).toBe(2);
    expect(result.lines[2].matchedSku?.code).toBe("SKU-DT-SE1KG");
  });

  it("Scenario 7: Missing unit requests flag MISSING_UNIT or BROKEN_CASE guardrail", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-07-MISSING-UNIT")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(2);

    // 5 dettol sabun -> unit missing
    expect(result.lines[0].extractedUnit).toBe("UNKNOWN");
    expect(result.lines[0].isAmbiguous).toBe(true);
    expect(result.lines[0].ambiguityReason).toBe("MISSING_UNIT");
  });

  it("Scenario 8: Out-of-catalog items are safely rejected with UNKNOWN_SKU", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-08-OUT-OF-CATALOG")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(2);
    for (const l of result.lines) {
      expect(l.matchedSku).toBeNull();
      expect(l.isAmbiguous).toBe(true);
      expect(l.ambiguityReason).toBe("UNKNOWN_SKU");
    }
  });

  it("Scenario 9: High-density 10-line wholesale bulk order parses all lines accurately", async () => {
    const scenario = REALISTIC_ORDER_SCENARIOS.find((s) => s.id === "SCENARIO-09-MEGA-WHOLESALE-ORDER")!;
    const result = await parser.parseText(scenario.rawMessage, context);

    expect(result.lines).toHaveLength(10);

    const expectedCodes = [
      "SKU-BS-PG075",
      "SKU-BS-GD120",
      "SKU-BS-MG250",
      "SKU-DT-GH1KG",
      "SKU-DT-CK250",
      "SKU-DT-SE1KG",
      "SKU-TE-TT500",
      "SKU-OL-FT1L",
      "SKU-DB-VM500",
      "SKU-PC-CG100",
    ];

    result.lines.forEach((line, idx) => {
      console.log(`Line ${idx}: "${line.rawUtterance}" -> ${line.matchedSku?.code} | conf=${line.confidence} | amb=${line.isAmbiguous}`);
      expect(line.matchedSku?.code).toBe(expectedCodes[idx]);
      expect(line.extractedQty).toBeGreaterThan(0);
      expect(line.extractedUnit).toBe("CASE");
      expect(line.confidence).toBeGreaterThanOrEqual(0.85);
      expect(line.isAmbiguous).toBe(false);
    });
  });
});
