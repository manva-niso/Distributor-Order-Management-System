import { describe, it, expect } from "vitest";
import {
  GeminiClosedSetChooser,
  CandidateSkuSummary,
} from "../ai/gemini-chooser";

describe("Module 5 Engine - Gemini Closed-Set Chooser (Tier 4)", () => {
  const sampleCandidates: CandidateSkuSummary[] = [
    {
      id: "SKU-BS-075",
      name: "Parle-G 75g Glucose Biscuit",
      brand: "Parle",
      category: "Biscuits & Confectionery",
      packSize: "75g",
    },
    {
      id: "SKU-MG-100",
      name: "Britannia Marie Gold 100g",
      brand: "Britannia",
      category: "Biscuits & Confectionery",
      packSize: "100g",
    },
    {
      id: "SKU-GD-060",
      name: "Britannia Good Day Butter 60g",
      brand: "Britannia",
      category: "Biscuits & Confectionery",
      packSize: "60g",
    },
  ];

  it("skips cleanly and returns source 'skipped' when no API key is provided", async () => {
    const chooser = new GeminiClosedSetChooser({ apiKey: "" });
    const result = await chooser.choose("kuch meetha biscuit bhejo", sampleCandidates);

    expect(result.chosenSkuId).toBeNull();
    expect(result.source).toBe("skipped");
    expect(result.confidence).toBe(0.1);
  });

  it("successfully parses valid JSON response and selects candidate from closed set", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      chosenSkuId: "SKU-BS-075",
                      confidence: 0.82,
                      reasoning: "Matched Parle-G glucose biscuits",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      );

    const chooser = new GeminiClosedSetChooser({
      apiKey: "test_key",
      fetchFn: mockFetch as any,
    });

    const result = await chooser.choose("parle glucose biscuit", sampleCandidates);

    expect(result.chosenSkuId).toBe("SKU-BS-075");
    expect(result.confidence).toBe(0.82);
    expect(result.source).toBe("gemini");
    expect(result.reasoning).toContain("Matched Parle-G");
  });

  it("plain-code guardrail: rejects hallucinated SKU ID not in candidate list", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      chosenSkuId: "SKU-OREO-120", // Hallucinated ID not in closed set!
                      confidence: 0.99,
                      reasoning: "Selected Oreo which is not in candidate set",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      );

    const chooser = new GeminiClosedSetChooser({
      apiKey: "test_key",
      fetchFn: mockFetch as any,
    });

    const result = await chooser.choose("oreo biscuit", sampleCandidates);

    // Hard guardrail MUST invalidate hallucinated SKU
    expect(result.chosenSkuId).toBeNull();
    expect(result.source).toBe("gemini");
    expect(result.confidence).toBe(0.15);
  });

  it("handles explicit NONE choice when no candidate matches", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      chosenSkuId: "NONE",
                      confidence: 0.1,
                      reasoning: "Utterance is completely unrelated to biscuits",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      );

    const chooser = new GeminiClosedSetChooser({
      apiKey: "test_key",
      fetchFn: mockFetch as any,
    });

    const result = await chooser.choose("cycle ka tyre tube", sampleCandidates);

    expect(result.chosenSkuId).toBeNull();
    expect(result.source).toBe("gemini");
  });

  it("handles network failure gracefully without throwing or crashing", async () => {
    const mockFetch = async () => {
      throw new Error("Connection refused (ECONNREFUSED)");
    };

    const chooser = new GeminiClosedSetChooser({
      apiKey: "test_key",
      fetchFn: mockFetch as any,
    });

    const result = await chooser.choose("marie biscuit", sampleCandidates);

    expect(result.chosenSkuId).toBeNull();
    expect(result.source).toBe("fallback");
    expect(result.reasoning).toContain("Connection refused");
  });

  it("handles malformed JSON from Gemini gracefully", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "This is not valid JSON at all" }],
              },
            },
          ],
        }),
        { status: 200 }
      );

    const chooser = new GeminiClosedSetChooser({
      apiKey: "test_key",
      fetchFn: mockFetch as any,
    });

    const result = await chooser.choose("good day", sampleCandidates);

    expect(result.chosenSkuId).toBeNull();
    expect(result.source).toBe("fallback");
    expect(result.reasoning).toContain("Failed to parse JSON");
  });
});
