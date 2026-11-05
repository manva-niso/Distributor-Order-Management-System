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
    this.model = options?.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    this.timeoutMs = options?.timeoutMs ?? 4000; // 4.0s timeout for mobile & cloud API response
    this.fetchFn = options?.fetchFn || globalThis.fetch;
  }

  public async choose(
    utterance: string,
    candidates: CandidateSkuSummary[]
  ): Promise<ChooserDecision> {
    // If no API key or no candidates, skip cleanly to deterministic fallback
    if (!this.apiKey || this.apiKey.trim() === "" || candidates.length === 0) {
      return {
        chosenSkuId: null,
        confidence: 0.1,
        reasoning: !this.apiKey ? "No GEMINI_API_KEY configured" : "No candidates available for closed set",
        source: "skipped",
      };
    }

    const candidateIds = candidates.map((c) => c.id);
    const candidateList = candidates
      .map((c) => `- ID: "${c.id}" | Name: "${c.name}" | Brand: "${c.brand}" | Pack: "${c.packSize}"`)
      .join("\n");

    const prompt = `You are an expert FMCG kirana wholesale order resolution assistant for Jabalpur, Madhya Pradesh.
A retailer sent this colloquial/vernacular order line:
"${utterance}"

Here are the retrieved catalog candidates:
${candidateList}

Your Task:
Pick the EXACT single SKU ID from the candidate list that matches the retailer's request.
If none of the candidates match, or if you are not at least 70% sure, you MUST select "NONE".

Rules:
1. You are strictly a closed-set chooser. You MUST choose an ID from [${candidateIds.map((id) => `"${id}"`).join(", ")}, "NONE"].
2. You MUST NEVER invent or hallucinate any SKU ID not in that list.
3. You MUST NEVER decide quantities or packaging units.

Respond in JSON format:
{
  "chosenSkuId": "SKU_ID_OR_NONE",
  "confidence": 0.85,
  "reasoning": "brief explanation"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0, // Zero temperature for deterministic classification
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          chosenSkuId: null,
          confidence: 0.1,
          reasoning: `Gemini API returned status ${response.status}`,
          source: "fallback",
        };
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return {
          chosenSkuId: null,
          confidence: 0.1,
          reasoning: "Empty response parts from Gemini",
          source: "fallback",
        };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return {
          chosenSkuId: null,
          confidence: 0.1,
          reasoning: "Failed to parse JSON response from Gemini",
          source: "fallback",
        };
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
      return {
        chosenSkuId: null,
        confidence: 0.1,
        reasoning: err?.name === "AbortError" ? "Gemini request timed out" : `Gemini error: ${err?.message}`,
        source: "fallback",
      };
    }
  }
}

// Global default chooser instance
export const defaultGeminiChooser = new GeminiClosedSetChooser();
