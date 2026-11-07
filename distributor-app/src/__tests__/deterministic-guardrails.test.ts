import { describe, it, expect, vi } from "vitest";
import { CascadedOrderParserPipeline } from "@/lib/ai/cascaded-parser";
import { GeminiClosedSetChooser } from "@/lib/ai/gemini-chooser";
import { processMediaOrder } from "@/lib/ai/multimodal";

describe("Deterministic Guardrails & Fallback Threshold Suite", () => {
  it("processes exact catalog items 100% deterministically with 0 Gemini calls", async () => {
    const mockChoose = vi.fn();
    const mockChooser = { choose: mockChoose } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const res = await pipeline.parseText("5 peti parle g\n2 case fortune tel 1L");

    expect(res.success).toBe(true);
    expect(res.lines).toHaveLength(2);
    expect(res.lines[0].matchedSku?.code).toBe("SKU-BS-075");
    expect(res.lines[0].source).toBe("rules");
    expect(res.lines[1].matchedSku?.code).toBe("SKU-OL-FT1L");
    expect(res.lines[1].source).toBe("rules");

    // Zero Gemini calls!
    expect(mockChoose).not.toHaveBeenCalled();
  });

  it("handles packaging guardrails (DABBA) 100% deterministically without Gemini", async () => {
    const mockChoose = vi.fn();
    const mockChooser = { choose: mockChoose } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const res = await pipeline.parseText("5 dabba tel");

    expect(res.success).toBe(true);
    expect(res.lines).toHaveLength(1);
    const line = res.lines[0];
    expect(line.extractedUnit).toBe("DABBA");
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("AMBIGUOUS_UNIT");
    expect(line.source).toBe("rules");

    // Invariant [A16] "Ask, Never Guess": Never let LLM guess packaging unit
    expect(mockChoose).not.toHaveBeenCalled();
  });

  it("handles missing units (MISSING_UNIT) 100% deterministically without Gemini", async () => {
    const mockChoose = vi.fn();
    const mockChooser = { choose: mockChoose } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const res = await pipeline.parseText("5 parle g");

    expect(res.success).toBe(true);
    const line = res.lines[0];
    expect(line.extractedUnit).toBe("UNKNOWN");
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("MISSING_UNIT");
    expect(line.source).toBe("rules");

    expect(mockChoose).not.toHaveBeenCalled();
  });

  it("rejects out-of-catalog items (chips) deterministically with plain-code reasoning", async () => {
    const mockChoose = vi.fn();
    const mockChooser = { choose: mockChoose } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const res = await pipeline.parseText("10 packet chips");

    expect(res.success).toBe(true);
    const line = res.lines[0];
    expect(line.matchedSku).toBeNull();
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("UNKNOWN_SKU");
    expect(line.source).toBe("rules");
    expect(line.reasoning).toBeDefined();
    expect(line.reasoning?.toLowerCase()).toContain("chips");

    // Zero Gemini calls for obvious out-of-catalog items!
    expect(mockChoose).not.toHaveBeenCalled();
  });

  it("escalates ambiguous competing candidates to Gemini when plausible candidates exist", async () => {
    const mockChoose = vi.fn().mockResolvedValue({
      chosenSkuId: "SKU-BS-GD120",
      confidence: 0.85,
      reasoning: "Selected Good Day Butter Cookies for butter biscuit phrase",
      source: "gemini",
    });
    const mockChooser = { choose: mockChoose } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const res = await pipeline.parseText("5 peti butter biscuit");

    expect(res.success).toBe(true);
    const line = res.lines[0];
    expect(mockChoose).toHaveBeenCalled();
    expect(line.matchedSku?.code).toBe("SKU-BS-GD120");
    expect(line.source).toBe("gemini");
  });

  it("escalates remote 15%-20% candidate matches to Gemini and resolves with concise reasoning", async () => {
    const mockChoose = vi.fn().mockResolvedValue({
      chosenSkuId: "SKU-BS-GD120",
      confidence: 0.82,
      reasoning: "Matches remote cookie query",
      source: "gemini",
    });
    const mockChooser = { choose: mockChoose } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const res = await pipeline.parseText("5 peti namkeen biscuit");
    expect(res.success).toBe(true);
    const line = res.lines[0];
    expect(mockChoose).toHaveBeenCalled();
    expect(line.matchedSku?.code).toBe("SKU-BS-GD120");
    expect(line.source).toBe("gemini");
    expect(line.reasoning).toBe("Matches remote cookie query");
  });

  it("returns honest no match with UNKNOWN_SKU when Gemini decides NONE for remote query", async () => {
    const mockChoose = vi.fn().mockResolvedValue({
      chosenSkuId: null,
      confidence: 0.15,
      reasoning: "No remote match in catalog",
      source: "gemini",
    });
    const mockChooser = { choose: mockChoose } as unknown as GeminiClosedSetChooser;

    const pipeline = new CascadedOrderParserPipeline({
      geminiChooser: mockChooser,
    });

    const res = await pipeline.parseText("5 peti namkeen biscuit");
    expect(res.success).toBe(true);
    const line = res.lines[0];
    expect(mockChoose).toHaveBeenCalled();
    expect(line.matchedSku).toBeNull();
    expect(line.isAmbiguous).toBe(true);
    expect(line.ambiguityReason).toBe("UNKNOWN_SKU");
    expect(line.source).toBe("gemini");
  });

  it("processes media audio via multimodal fallback pipeline", async () => {
    const dummyAudioBuffer = Buffer.from("dummy_audio_bytes_mandi_speech");
    const result = await processMediaOrder({
      buffer: dummyAudioBuffer,
      mimeType: "audio/wav",
      mediaType: "audio",
    });

    expect(result).toBeDefined();
    expect(result.extractedText.length).toBeGreaterThan(0);
    expect(["vaani_whisper", "vaani_fastconformer", "gemini_multimodal", "offline_simulation"]).toContain(
      result.source
    );
  });
});
