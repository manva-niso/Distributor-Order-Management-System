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
        // Only escalate to Gemini if:
        // 1. LLM escalation is enabled
        // 2. Line confidence is below threshold (< 0.70) or SKU is unknown / multiple candidates
        // 3. Retrieved candidate set is non-empty
        const needsEscalation =
          line.confidence < 0.70 ||
          line.matchedSku === null ||
          line.ambiguityReason === "MULTIPLE_CANDIDATES" ||
          line.ambiguityReason === "UNKNOWN_SKU";

        if (!this.enableLLM || !needsEscalation || line.candidates.length === 0) {
          return line;
        }

        const candidateSummaries = line.candidates.slice(0, 5).map((c) => ({
          id: c.sku.id,
          name: c.sku.name,
          brand: c.sku.brand,
          category: c.sku.category,
          packSize: c.sku.packSize,
        }));

        const decision = await this.chooser.choose(line.rawUtterance, candidateSummaries);

        if (decision.chosenSkuId) {
          const matchedCandidate = line.candidates.find(
            (c) => c.sku.id === decision.chosenSkuId
          );
          if (matchedCandidate) {
            const matchedSku = matchedCandidate.sku;

            // Tier 5: Enforce Plain Code Guardrails (Never let LLM override unit invariants)
            let updatedAmbiguityReason: AmbiguityReason = null;
            let updatedIsAmbiguous = false;

            if (line.extractedUnit === "DABBA") {
              updatedIsAmbiguous = true;
              updatedAmbiguityReason = "AMBIGUOUS_UNIT";
            } else if (line.extractedUnit === "UNKNOWN") {
              updatedIsAmbiguous = true;
              updatedAmbiguityReason = "MISSING_UNIT";
            } else if (line.brokenCaseInfo) {
              updatedIsAmbiguous = true;
              updatedAmbiguityReason = "BROKEN_CASE";
            }

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
              isAmbiguous: updatedIsAmbiguous,
              ambiguityReason: updatedAmbiguityReason,
              resolvedQtyCases,
              resolvedQtyPacks,
            };
          }
        }

        return line;
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
