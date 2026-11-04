import { describe, it, expect, vi } from "vitest";
import { CascadedOrderParserPipeline } from "@/lib/ai/cascaded-parser";
import { GeminiClosedSetChooser } from "@/lib/ai/gemini-chooser";

describe("Module 5 Engine - Cascaded Adaptive Order Parser Pipeline", () => {
  it("processes high-confidence lines deterministically without calling Gemini chooser", async () => {
    const mockChoose = vi.fn();
    const mockChooser = {
      choose: mockChoose,
    } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const result = await pipeline.parseText("5 peti parle g\n2 case fortune tel");

    expect(result.success).toBe(true);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].matchedSku?.code).toBe("SKU-BS-075");
    expect(result.lines[0].confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.lines[1].matchedSku?.code).toBe("SKU-OL-FT1L");
    expect(result.lines[1].confidence).toBeGreaterThanOrEqual(0.85);

    // ZERO calls to Gemini for deterministic matches!
    expect(mockChoose).not.toHaveBeenCalled();
  });

  it("escalates competing/ambiguous candidates to Gemini and adopts valid choice", async () => {
    const mockChooser = {
      choose: vi.fn().mockResolvedValue({
        chosenSkuId: "SKU-BS-075",
        confidence: 0.78,
        reasoning: "Selected Parle-G 75g for colloquial biscuit phrase",
        source: "gemini",
      }),
    } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    // Competing biscuit candidates: Parle-G, Marie Gold, Good Day
    const result = await pipeline.parseText("2 peti crunchy biskut");

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];
    expect(mockChooser.choose).toHaveBeenCalled();
    expect(line.matchedSku?.code).toBe("SKU-BS-075");
    expect(line.confidence).toBe(0.78);
    expect(line.isAmbiguous).toBe(false);
  });

  it("retains Dabba polysemy guardrail even when Gemini resolves the product", async () => {
    const mockChooser = {
      choose: vi.fn().mockResolvedValue({
        chosenSkuId: "SKU-BS-075",
        confidence: 0.80,
        reasoning: "Resolved Parle-G",
        source: "gemini",
      }),
    } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    // User specifies "dabba"
    const result = await pipeline.parseText("2 dabba crunchy biskut");

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];
    expect(line.matchedSku?.code).toBe("SKU-BS-075");
    // HARD GUARDRAIL: Must still flag AMBIGUOUS_UNIT for "dabba"
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("AMBIGUOUS_UNIT");
  });

  it("retains UNKNOWN_SKU when Gemini returns null / NONE or when item not in catalog", async () => {
    const mockChooser = {
      choose: vi.fn().mockResolvedValue({
        chosenSkuId: null,
        confidence: 0.1,
        reasoning: "No matching candidate",
        source: "gemini",
      }),
    } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const result = await pipeline.parseText("3 peti anjaan item jo catalog me nahi hai");

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];
    expect(line.matchedSku).toBeNull();
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("UNKNOWN_SKU");
  });
});
