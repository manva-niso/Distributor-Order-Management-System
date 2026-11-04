import { describe, it, expect } from "vitest";
import {
  CalibratedConfidenceScorer,
  defaultCalibratedScorer,
} from "../ai/calibrated-scorer";

describe("Module 5 Engine - Calibrated Probabilistic Confidence Scorer", () => {
  const scorer = new CalibratedConfidenceScorer();

  it("yields high probability (>= 0.95) and AUTO_CONFIRM for exact alias hit with valid case unit", () => {
    const result = scorer.score({
      aliasHit: true,
      topCandidateScore: 1.0,
      runnerUpScore: 0.0,
      unit: "CASE",
      quantity: 5,
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.decision).toBe("AUTO_CONFIRM");
    expect(result.isAmbiguous).toBe(false);
    expect(result.ambiguityReason).toBeNull();
  });

  it("enforces Dabba Guardrail: caps probability <= 0.70 and triggers DISAMBIGUATION even with alias hit", () => {
    const result = scorer.score({
      aliasHit: true,
      topCandidateScore: 1.0,
      runnerUpScore: 0.0,
      unit: "DABBA",
      quantity: 2,
    });

    expect(result.confidence).toBeLessThanOrEqual(0.70);
    expect(result.confidence).toBeGreaterThanOrEqual(0.50);
    expect(result.decision).toBe("DISAMBIGUATION");
    expect(result.isAmbiguous).toBe(true);
    expect(result.ambiguityReason).toBe("AMBIGUOUS_UNIT");
  });

  it("yields AUTO_CONFIRM (>= 0.85) for retrieved candidate with wide margin gap", () => {
    const result = scorer.score({
      aliasHit: false,
      topCandidateScore: 0.88,
      runnerUpScore: 0.30, // Margin gap = 0.58
      unit: "CASE",
      quantity: 3,
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.marginGap).toBe(0.58);
    expect(result.decision).toBe("AUTO_CONFIRM");
    expect(result.isAmbiguous).toBe(false);
  });

  it("triggers MULTIPLE_CANDIDATES disambiguation when candidates compete closely (margin gap < 0.08)", () => {
    const result = scorer.score({
      aliasHit: false,
      topCandidateScore: 0.58,
      runnerUpScore: 0.55, // Margin gap = 0.03
      unit: "CASE",
      quantity: 4,
    });

    expect(result.isAmbiguous).toBe(true);
    expect(result.ambiguityReason).toBe("MULTIPLE_CANDIDATES");
    expect(result.confidence).toBeLessThan(0.70);
    expect(result.confidence).toBeGreaterThanOrEqual(0.45);
    expect(result.decision).toBe("DISAMBIGUATION");
  });

  it("triggers MISSING_UNIT disambiguation and caps confidence <= 0.62 when unit is UNKNOWN", () => {
    const result = scorer.score({
      aliasHit: true,
      topCandidateScore: 1.0,
      runnerUpScore: 0.0,
      unit: "UNKNOWN",
      quantity: 10,
    });

    expect(result.isAmbiguous).toBe(true);
    expect(result.ambiguityReason).toBe("MISSING_UNIT");
    expect(result.confidence).toBeLessThanOrEqual(0.62);
    expect(result.decision).toBe("DISAMBIGUATION");
  });

  it("triggers ESCALATE_CHOOSER with very low confidence (<= 0.20) for UNKNOWN_SKU", () => {
    const result = scorer.score({
      aliasHit: false,
      topCandidateScore: 0.15,
      runnerUpScore: 0.10,
      unit: "CASE",
      quantity: 2,
    });

    expect(result.confidence).toBeLessThanOrEqual(0.20);
    expect(result.decision).toBe("ESCALATE_CHOOSER");
    expect(result.isAmbiguous).toBe(true);
    expect(result.ambiguityReason).toBe("UNKNOWN_SKU");
  });

  it("routes BROKEN_CASE to DISAMBIGUATION while maintaining high product confidence", () => {
    const result = scorer.score({
      aliasHit: false,
      topCandidateScore: 0.85,
      runnerUpScore: 0.20,
      unit: "PACK",
      quantity: 15,
      isBrokenCase: true,
    });

    expect(result.isAmbiguous).toBe(true);
    expect(result.ambiguityReason).toBe("BROKEN_CASE");
    expect(result.decision).toBe("DISAMBIGUATION");
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });
});
