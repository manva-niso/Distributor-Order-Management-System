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
import { fmcgKnowledgeGraph } from "./knowledge-graph";
import { learnedScorer } from "./ml/learned-scorer";
import { retailerPriorEngine } from "./ml/retailer-prior";

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
        // 1. Deterministic Out-of-Catalog Rejection (Threshold relaxed to 0.15 / 15%)
        // If candidate retriever found no plausible candidates (or top candidate score < 0.15),
        // we deterministically know the requested item is NOT in the wholesale catalog.
        // Zero cloud latency, zero LLM cost, instant local rejection with informative reasoning.
        const FALLBACK_THRESHOLD = 0.15;
        const topCandidateScore = line.candidates[0]?.score || 0;
        const hasPlausibleCandidates = line.candidates.length > 0 && topCandidateScore >= FALLBACK_THRESHOLD;

        if (line.matchedSku === null && !hasPlausibleCandidates) {
          const kg = fmcgKnowledgeGraph.getSmartSuggestions({
            rawUtterance: line.rawUtterance,
            catalog: activeSkus,
            topK: 3,
          });

          return {
            ...line,
            isAmbiguous: true,
            ambiguityReason: "UNKNOWN_SKU" as AmbiguityReason,
            confidence: 0.15,
            candidates: kg.candidates.length > 0 ? kg.candidates : line.candidates,
            reasoning: kg.explanation || `The requested item "${line.rawUtterance}" is not available in Company A's wholesale catalog.`,
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

        // 3. High Confidence Deterministic Matches (Confidence >= 0.85 and not ambiguous)
        if (line.confidence >= 0.85 && line.matchedSku !== null && !line.isAmbiguous) {
          return {
            ...line,
            source: "rules" as const,
          };
        }

        // 4. True LLM Fallback (Tier 4):
        // Escalate when:
        // - LLM is enabled
        // - Plausible candidate SKUs exist in the catalog (score >= 0.15, including 15%-20% remote matches)
        // - Item is unmatched, ambiguous, has multiple candidates, or confidence is under 0.85
        const needsEscalation =
          this.enableLLM &&
          hasPlausibleCandidates &&
          (line.ambiguityReason === "MULTIPLE_CANDIDATES" ||
            line.matchedSku === null ||
            line.isAmbiguous ||
            line.confidence < 0.85);

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
              source: decision.source as ParsedLineItem["source"],
            };
          }
        }

        // If Gemini did not find a match in the closed candidate set ("NONE" or outside set):
        // Return honest "no match" cleanly with guardrails
        return {
          ...line,
          matchedSku: null,
          confidence: decision.confidence ?? 0.15,
          isAmbiguous: true,
          ambiguityReason: "UNKNOWN_SKU" as AmbiguityReason,
          reasoning: decision.reasoning || `No match found in wholesale catalog for "${line.rawUtterance}".`,
          source: (decision.source === "gemini" ? "gemini" : "rules") as ParsedLineItem["source"],
        };
      })
    );

    // Tier 3 Enrichment: Apply Learned Scorer, Platt Calibration & Retailer Prior Anomaly Detection
    const enrichedLines: ParsedLineItem[] = resolvedLines.map((line) => {
      if (!line.matchedSku) {
        return {
          ...line,
          autoConfirm: false,
          calibratedProb: line.confidence,
          scorerDecision: "DESK_CONFIRM" as const,
        };
      }

      const topScore = line.candidates[0]?.score || line.confidence;
      const runnerUpScore = line.candidates[1]?.score || 0.0;
      const aliasHit = line.confidence >= 0.95 && line.source === "rules";

      const prediction = learnedScorer.predict({
        utterance: line.rawUtterance,
        candidateSku: line.matchedSku,
        s1_top_score: topScore,
        s2_runner_up_score: runnerUpScore,
        aliasHit,
        unit: line.extractedUnit,
        quantity: line.resolvedQtyCases || line.extractedQty,
        retailerId: context?.retailerId,
      });

      let quantityWarning: string | undefined = undefined;
      if (context?.retailerId && line.resolvedQtyCases > 0) {
        const anomaly = retailerPriorEngine.detectQuantityAnomaly(
          context.retailerId,
          line.matchedSku,
          line.resolvedQtyCases,
          line.resolvedQtyPacks || 0
        );
        if (anomaly.isAnomaly && anomaly.warningMessage) {
          quantityWarning = anomaly.warningMessage;
        }
      }

      return {
        ...line,
        autoConfirm: prediction.autoConfirm,
        calibratedProb: prediction.calibratedProb,
        scorerDecision: prediction.decision,
        quantityWarning,
        retailerPriorApplied: Boolean(context?.retailerId),
      };
    });

    const ambiguousCount = enrichedLines.filter((l) => l.isAmbiguous).length;

    return {
      success: enrichedLines.length > 0,
      rawText,
      lines: enrichedLines,
      totalLines: enrichedLines.length,
      ambiguousCount,
      pipelineName: this.name,
    };
  }
}

// Global default instance
export const cascadedOrderParser = new CascadedOrderParserPipeline();
