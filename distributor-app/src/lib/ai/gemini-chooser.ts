export interface CandidateSkuSummary {
  id: string;
  name: string;
  brand: string;
  category: string;
  packSize: string;
}

export interface ChooserOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface ChooserDecision {
  chosenSkuId: string | null;
  confidence: number;
  reasoning: string;
  source: "gemini" | "fallback" | "skipped";
}

/**
 * Constrained Gemini 1.5 Closed-Set Chooser (Tier 4)
 *
 * Implements theoretical principles from:
 * - Cascaded LLMs for Human-AI Decisions (arXiv:2506.11887)
 * - LLM Cascades with Early Abstention (arXiv:2502.09054)
 * - Flipkart Code-Mix Query Translation & FMCG Entity Resolution (ACL 2023)
 *
 * Enforces strict closed-set selection:
 * 1. Gemini only receives the top candidate SKUs retrieved by RRF (Tier 2).
 * 2. It chooses exactly ONE ID from the candidate set, or "NONE".
 * 3. Gemini is STRICTLY FORBIDDEN from inventing new SKUs or deciding packaging units.
 * 4. Plain code validates that the chosen ID belongs to the provided candidates.
 */
export class GeminiClosedSetChooser {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private fetchFn: typeof fetch;

  constructor(options?: ChooserOptions) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || "";
    this.model = options?.model || process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    this.timeoutMs = options?.timeoutMs ?? 8000;
    this.fetchFn = options?.fetchFn || globalThis.fetch;
  }

  public async choose(
    utterance: string,
    candidates: CandidateSkuSummary[]
  ): Promise<ChooserDecision> {
    const activeApiKey = this.apiKey || process.env.GEMINI_API_KEY || "";
    const activeModel = this.model || process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    // If no API key or no candidates, skip cleanly to deterministic fallback
    if (!activeApiKey || activeApiKey.trim() === "" || candidates.length === 0) {
      return {
        chosenSkuId: null,
        confidence: 0.1,
        reasoning: !activeApiKey ? "No GEMINI_API_KEY configured" : "No candidates available for closed set",
        source: "skipped",
      };
    }

    const candidateIds = candidates.map((c) => c.id);
    const candidateList = candidates
      .map((c) => `- ID: "${c.id}" | Name: "${c.name}" | Brand: "${c.brand}" | Pack: "${c.packSize}"`)
      .join("\n");

    const prompt = `You are an FMCG wholesale order item matcher for a Jabalpur catalog.
Customer query: "${utterance}"

Catalog Candidates:
${candidateList}

Task:
Check if any candidate matches closely or remotely based on the query written.
- If a candidate matches remotely or closely, return its single SKU ID from [${candidateIds.map((id) => `"${id}"`).join(", ")}].
- If nothing matches remotely, you MUST choose "NONE".
Keep reasoning under 8 words. Use minimal tokens.

JSON Format:
{
  "chosenSkuId": "SKU_ID_OR_NONE",
  "confidence": 0.85,
  "reasoning": "brief match explanation"
}`;

    const candidateModels = [
      activeModel,
      "gemini-2.5-flash",
      "gemini-3.1-flash-lite",
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let lastErrorReason = "";

    for (const modelToTry of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${activeApiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0, // Zero temperature for deterministic classification
            maxOutputTokens: 100, // Minimal tokens for fast, concise responses
            responseMimeType: "application/json",
          },
        };

        const response = await this.fetchFn(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          lastErrorReason = `Model ${modelToTry} returned status ${response.status}: ${errBody.slice(0, 100)}`;
          // Quota exhausted (429), high demand (503), or deprecated (404) -> roll over to next model
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastErrorReason = `Model ${modelToTry} returned empty response parts`;
          continue;
        }

        let parsed: any;
        try {
          let jsonStr = rawText.trim();
          const firstBrace = jsonStr.indexOf("{");
          const lastBrace = jsonStr.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          }
          parsed = JSON.parse(jsonStr);
        } catch {
          lastErrorReason = `Failed to parse JSON response from Gemini (${modelToTry})`;
          continue;
        }

        const rawChosenId = typeof parsed.chosenSkuId === "string" ? parsed.chosenSkuId.trim() : null;

        // Hard Plain-Code Closed-Set Verification Guardrail:
        if (!rawChosenId || rawChosenId === "NONE" || !candidateIds.includes(rawChosenId)) {
          return {
            chosenSkuId: null,
            confidence: 0.15,
            reasoning: parsed.reasoning || "Gemini indicated NONE or chose outside candidate set",
            source: "gemini",
          };
        }

        // Valid candidate picked from closed set
        const modelConfidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.75;
        const calibratedProb = Math.min(0.85, Math.max(0.40, Math.round(modelConfidence * 100) / 100));

        return {
          chosenSkuId: rawChosenId,
          confidence: calibratedProb,
          reasoning: parsed.reasoning || `Gemini selected candidate ${rawChosenId}`,
          source: "gemini",
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastErrorReason = err?.name === "AbortError" ? `Model ${modelToTry} timed out` : `Model ${modelToTry} error: ${err?.message}`;
        continue;
      }
    }

    return {
      chosenSkuId: null,
      confidence: 0.1,
      reasoning: lastErrorReason || "All Gemini models in cascade failed",
      source: "fallback",
    };
  }
}

// Global default chooser instance
export const defaultGeminiChooser = new GeminiClosedSetChooser();
