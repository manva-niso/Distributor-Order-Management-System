import { SEED_SKUS, SeedSku } from "@/db/seed-data";
import {
  ParsedLineItem,
  ParseResult,
  OrderParserPipeline,
  ParserContext,
  AmbiguityReason,
} from "./types";
import { parseSingleUtterance, splitOrderTextIntoLines } from "./text-parser";
import { GeminiClosedSetChooser, defaultGeminiChooser } from "./gemini-chooser";

export interface CascadedParserOptions {
  geminiChooser?: GeminiClosedSetChooser;
  enableLLM?: boolean;
}

/**
 * 5-Tier Adaptive Cascaded Order Parser Pipeline
 *
 * Architecture:
 * - Tier 0: Retailer Alias Table (Instant exact match)
 * - Tier 1: Deterministic Structural Parser (Devanagari/Hinglish numerals, units, fractions)
 * - Tier 2: RRF Candidate Retrieval (Trigram + Keyword + Phonetic at k=60)
 * - Tier 3: Calibrated Probabilistic Confidence Scorer (Platt scaling / logistic sigmoid)
 * - Tier 4: Constrained Gemini Closed-Set Chooser (Zero hallucination, closed candidate set)
 * - Tier 5: Plain Code Packaging Guardrails (Ask Never Guess, Dabba Polysemy, Broken Cases)
 */
export class CascadedOrderParserPipeline implements OrderParserPipeline {
  public name = "cascaded_adaptive";
  private chooser: GeminiClosedSetChooser;
  private enableLLM: boolean;

  constructor(options?: CascadedParserOptions) {
    this.chooser = options?.geminiChooser || defaultGeminiChooser;
    this.enableLLM = options?.enableLLM ?? true;
  }

  public async parseText(rawText: string, context?: ParserContext): Promise<ParseResult> {
    const activeSkus = context?.availableSkus || SEED_SKUS;
    const rawLines = splitOrderTextIntoLines(rawText);

    // Tiers 0 - 3: Deterministic parsing, RRF retrieval, and Platt calibration
    const initialParsedLines = rawLines.map((utterance) =>
      parseSingleUtterance(utterance, activeSkus, context?.retailerAliases)
    );

    // Tier 4: For lines requiring escalation to Chooser, invoke Gemini in parallel
    const resolvedLines = await Promise.all(
      initialParsedLines.map(async (line) => {
        // 1. Deterministic Out-of-Catalog Rejection
        // If candidate retriever found no plausible candidates (or top candidate score < 0.20),
        // we deterministically know the requested item is NOT in the wholesale catalog.
        // Zero cloud latency, zero LLM cost, instant local rejection with informative reasoning.
        const topCandidateScore = line.candidates[0]?.score || 0;
        const hasPlausibleCandidates = line.candidates.length > 0 && topCandidateScore >= 0.20;

        if (line.matchedSku === null && !hasPlausibleCandidates) {
          return {
            ...line,
            isAmbiguous: true,
            ambiguityReason: "UNKNOWN_SKU" as AmbiguityReason,
            confidence: 0.15,
            reasoning: `The requested item "${line.rawUtterance}" is not available in Company A's wholesale catalog.`,
            source: "rules" as const,
          };
        }

        // 2. Packaging & Business Guardrails (Invariant [A16] "Ask, Never Guess")
        // NEVER escalate packaging ambiguities (Dabba, Missing Unit, Broken Case) to LLM.
        // These are strictly business choices resolved via plain-code UI Disambiguation Cards in 0ms.
        const isPackagingGuardrail =
          line.extractedUnit === "DABBA" ||
          (line.extractedUnit === "UNKNOWN" && line.matchedSku !== null) ||
          Boolean(line.brokenCaseInfo);

        if (isPackagingGuardrail) {
          return {
            ...line,
            source: "rules" as const,
          };
        }

        // 3. High Confidence Deterministic Matches (Confidence >= 0.75 and not ambiguous)
        if (line.confidence >= 0.75 && line.matchedSku !== null && !line.isAmbiguous) {
          return {
            ...line,
            source: "rules" as const,
          };
        }

        // 4. True LLM Fallback (Tier 4):
        // Only escalate when:
        // - LLM is enabled
        // - Plausible candidate SKUs exist in the catalog that compete closely (MULTIPLE_CANDIDATES)
        //   or when local regex could not resolve a single winner from a colloquial description
        const needsEscalation =
          this.enableLLM &&
          hasPlausibleCandidates &&
          (line.ambiguityReason === "MULTIPLE_CANDIDATES" ||
            (line.confidence < 0.70 && line.matchedSku === null));

        if (!needsEscalation) {
          return {
            ...line,
            source: "rules" as const,
          };
        }

        // Pass top candidate SKUs to Gemini Closed-Set Chooser
        const candidatePool = line.candidates.map((c) => c.sku);
        const candidateSummaries = candidatePool.slice(0, 8).map((sku) => ({
          id: sku.id,
          name: sku.name,
          brand: sku.brand,
          category: sku.category,
          packSize: sku.packSize,
        }));

        const decision = await this.chooser.choose(line.rawUtterance, candidateSummaries);

        if (decision.chosenSkuId) {
          const matchedSku = activeSkus.find((s) => s.id === decision.chosenSkuId);
          if (matchedSku) {
            // Re-calculate cart quantities based on chosen SKU
            let resolvedQtyCases = line.extractedQty || 1;
            let resolvedQtyPacks = 0;
            if (line.extractedUnit === "PACK") {
              resolvedQtyPacks = line.extractedQty || 1;
              resolvedQtyCases = Math.max(1, Math.ceil((line.extractedQty || 1) / matchedSku.unitsPerCase));
            } else {
              resolvedQtyCases = line.extractedQty || 1;
              resolvedQtyPacks = 0;
            }

            return {
              ...line,
              matchedSku,
              confidence: decision.confidence,
              isAmbiguous: false,
              ambiguityReason: null,
              resolvedQtyCases,
              resolvedQtyPacks,
              reasoning: decision.reasoning,
              source: decision.source,
            };
          }
        }

        // If Gemini did not find a match in the closed candidate set
        return {
          ...line,
          confidence: decision.confidence ?? line.confidence,
          reasoning: decision.reasoning || line.reasoning,
          source: decision.source || "fallback",
        };
      })
    );

    const ambiguousCount = resolvedLines.filter((l) => l.isAmbiguous).length;

    return {
      success: resolvedLines.length > 0,
      rawText,
      lines: resolvedLines,
      totalLines: resolvedLines.length,
      ambiguousCount,
      pipelineName: this.name,
    };
  }
}

// Global default instance
export const cascadedOrderParser = new CascadedOrderParserPipeline();
