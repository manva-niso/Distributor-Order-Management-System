import { UnitType, AmbiguityReason } from "./types";

export type RoutingDecision = "AUTO_CONFIRM" | "DISAMBIGUATION" | "ESCALATE_CHOOSER";

export interface ScorerFeatures {
  aliasHit: boolean;
  topCandidateScore: number; // S1 in [0.0, 1.0] from RRF
  runnerUpScore: number; // S2 in [0.0, 1.0] (0 if none)
  unit: UnitType;
  quantity: number | null;
  isBrokenCase?: boolean;
}

export interface CalibratedScoreResult {
  confidence: number; // Calibrated probability in [0.05, 0.98]
  marginGap: number; // S1 - S2
  decision: RoutingDecision;
  isAmbiguous: boolean;
  ambiguityReason: AmbiguityReason;
  rawLogit: number;
}

/**
 * Standard Sigmoid Function: sigma(z) = 1 / (1 + e^(-z))
 */
function sigmoid(z: number): number {
  return 1.0 / (1.0 + Math.exp(-z));
}

/**
 * Calibrated Probabilistic Confidence Scorer (Platt Scaling / Logistic Calibration)
 *
 * Implements theoretical principles from:
 * - LLM Cascades with Early Abstention (arXiv:2502.09054)
 * - Cascaded LLMs for Human-AI Decisions (arXiv:2506.11887)
 * - Universal Calibrated Cascade Inference (UCCI / arXiv:2605.18796)
 *
 * Instead of ad-hoc score additions (0.65 + 0.15 + 0.2), converts candidate margin gap,
 * lexical/phonetic RRF score, alias hit, and packaging invariants into a true probability.
 */
export class CalibratedConfidenceScorer {
  // Calibrated logistic regression weights
  private w0: number = -1.2; // Baseline intercept
  private wAlias: number = 3.6; // High reward for verified merchant alias
  private wTopScore: number = 2.8; // Weight of RRF top score S1
  private wGap: number = 2.4; // Separation margin weight (S1 - S2)
  private wValidQty: number = 0.8; // Reward for positive non-zero quantity

  /**
   * Evaluates feature log-odds and computes calibrated probability
   */
  public score(features: ScorerFeatures): CalibratedScoreResult {
    const { aliasHit, topCandidateScore, runnerUpScore, unit, quantity, isBrokenCase } = features;
    const marginGap = Math.max(0, topCandidateScore - runnerUpScore);
    const hasValidQty = quantity !== null && quantity > 0;

    // 1. Calculate Logit z
    let z = this.w0;

    if (aliasHit) {
      z += this.wAlias;
    } else {
      z += this.wTopScore * topCandidateScore;
      z += this.wGap * marginGap;
    }

    if (hasValidQty) {
      z += this.wValidQty;
    } else {
      z -= 0.6; // Penalty for missing quantity
    }

    // 2. Base Probability from Logistic Sigmoid
    let prob = sigmoid(z);

    // 3. Packaging & Guardrail Invariants (Invariant [A16] "Ask, Never Guess")
    let isAmbiguous = false;
    let ambiguityReason: AmbiguityReason = null;

    if (isBrokenCase) {
      isAmbiguous = true;
      ambiguityReason = "BROKEN_CASE";
      // Broken case is a business clarification, probability of product match remains high
      prob = Math.min(0.88, prob);
    } else if (unit === "DABBA") {
      // "Dabba" Semantic Ambiguity Guardrail:
      // Product may be known, but packaging unit is polysemic (Case vs Inner Box vs Oil Tin).
      // Hard cap probability at 0.68 so it ALWAYS routes to Disambiguation Card!
      isAmbiguous = true;
      ambiguityReason = "AMBIGUOUS_UNIT";
      prob = Math.min(0.68, Math.max(0.52, prob * 0.70));
    } else if (unit === "UNKNOWN") {
      // Missing unit: Hard cap probability at 0.62 so it ALWAYS routes to Missing Unit Card
      isAmbiguous = true;
      ambiguityReason = "MISSING_UNIT";
      prob = Math.min(0.62, Math.max(0.45, prob * 0.65));
    } else if (!aliasHit && topCandidateScore >= 0.35 && runnerUpScore > 0 && marginGap < 0.08) {
      // Competing candidates with very narrow separation (e.g. Marie Gold vs Good Day)
      isAmbiguous = true;
      ambiguityReason = "MULTIPLE_CANDIDATES";
      prob = Math.min(0.65, Math.max(0.48, prob * 0.75));
    } else if (!aliasHit && topCandidateScore < 0.35) {
      // Unknown SKU: no candidate reached baseline threshold
      isAmbiguous = true;
      ambiguityReason = "UNKNOWN_SKU";
      prob = Math.min(0.20, prob * 0.3);
    }

    // Round probability to 2 decimal places in [0.05, 0.98]
    const finalConfidence = Math.min(0.98, Math.max(0.05, Math.round(prob * 100) / 100));

    // 4. Calibrated Routing Decision
    let decision: RoutingDecision;
    if (!isAmbiguous && finalConfidence >= 0.85) {
      decision = "AUTO_CONFIRM";
    } else if (ambiguityReason === "UNKNOWN_SKU" || finalConfidence < 0.45) {
      decision = "ESCALATE_CHOOSER";
    } else {
      decision = "DISAMBIGUATION";
    }

    return {
      confidence: finalConfidence,
      marginGap: Math.round(marginGap * 100) / 100,
      decision,
      isAmbiguous,
      ambiguityReason,
      rawLogit: Math.round(z * 100) / 100,
    };
  }
}

// Global default scorer instance
export const defaultCalibratedScorer = new CalibratedConfidenceScorer();
