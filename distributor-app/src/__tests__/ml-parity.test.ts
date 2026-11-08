import { describe, it, expect } from "vitest";
import { learnedScorer } from "@/lib/ai/ml/learned-scorer";
import { retailerPriorEngine } from "@/lib/ai/ml/retailer-prior";
import { MASTER_CATALOG_SKUS } from "@/db/master-data";
import { dbStore } from "@/db/store";
import parityVectors from "@/lib/ai/ml/data/parity_test_vectors.json";

interface ParityVector {
  features: number[];
  rawLogit: number;
  rawProb: number;
  calibratedProb: number;
  isAmbiguousUnit: boolean;
  autoConfirm: boolean;
  expectedLabel: number;
}

describe("Learned Scorer & Calibration Parity Tests (TS vs Python / Scikit-Learn)", () => {
  it("verifies mathematical parity across 100 scikit-learn test vectors (|P_TS - P_sklearn| < 1e-5)", () => {
    const vectors = parityVectors as ParityVector[];
    expect(vectors.length).toBeGreaterThan(0);

    let maxLogitDiff = 0;
    let maxProbDiff = 0;

    for (const v of vectors) {
      const tsResult = learnedScorer.scoreVector(v.features);

      const logitDiff = Math.abs(tsResult.rawLogit - v.rawLogit);
      const probDiff = Math.abs(tsResult.calibratedProb - v.calibratedProb);

      if (logitDiff > maxLogitDiff) maxLogitDiff = logitDiff;
      if (probDiff > maxProbDiff) maxProbDiff = probDiff;

      expect(logitDiff).toBeLessThan(1e-5);
      expect(probDiff).toBeLessThan(1e-5);

      const autoConfirm = tsResult.calibratedProb >= learnedScorer.threshold && !v.isAmbiguousUnit;
      expect(autoConfirm).toBe(v.autoConfirm);
    }

    console.log(`Parity Verified: maxLogitDiff=${maxLogitDiff.toExponential(4)}, maxProbDiff=${maxProbDiff.toExponential(4)}`);
  });

  it("enforces Hard Invariant: lines with ambiguous units (DABBA or UNKNOWN) NEVER auto-confirm", () => {
    const fakeSku = MASTER_CATALOG_SKUS[0];

    // High scoring vector that would normally auto-confirm, but has unit: DABBA
    const dabbaPrediction = learnedScorer.predict({
      utterance: "10 dabba parle g",
      candidateSku: fakeSku,
      s1_top_score: 1.0,
      s2_runner_up_score: 0.1,
      aliasHit: true,
      unit: "DABBA",
      quantity: 10,
    });

    expect(dabbaPrediction.isAmbiguousUnit).toBe(true);
    expect(dabbaPrediction.autoConfirm).toBe(false);
    expect(dabbaPrediction.decision).toBe("ASK_UNIT");

    // UNKNOWN unit
    const unknownUnitPrediction = learnedScorer.predict({
      utterance: "10 parle g",
      candidateSku: fakeSku,
      s1_top_score: 1.0,
      s2_runner_up_score: 0.1,
      aliasHit: true,
      unit: "UNKNOWN",
      quantity: 10,
    });

    expect(unknownUnitPrediction.isAmbiguousUnit).toBe(true);
    expect(unknownUnitPrediction.autoConfirm).toBe(false);
    expect(unknownUnitPrediction.decision).toBe("ASK_UNIT");
  });

  it("enforces Retailer Prior & Soft One-Tap Quantity Warning: flags >3x median & >max, suppresses on scheme threshold", () => {
    const testRetailerId = "RET-PRIOR-TEST";
    const skuWithScheme = MASTER_CATALOG_SKUS.find((s) => s.schemeType === "FREE_GOODS" && s.schemeDetail?.buyQty) || MASTER_CATALOG_SKUS[0];
    const skuNoScheme = MASTER_CATALOG_SKUS.find((s) => s.schemeType === "NONE") || MASTER_CATALOG_SKUS[2];

    // Seed 3 historical orders to establish prior (median = 2 cases, max = 2 cases)
    for (let i = 1; i <= 3; i++) {
      dbStore.createOrder(
        {
          id: `ORD-PRIOR-${i}`,
          retailerId: testRetailerId,
          placedBy: "Test Retailer",
          status: "VERIFIED",
          subtotal: 1000,
          schemeDiscount: 0,
          taxableAmount: 1000,
          totalGst: 180,
          grandTotal: 1180,
          freeGoodsTally: [],
          occVersion: 1,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
        [
          {
            id: `item_prior_${i}_1`,
            orderId: `ORD-PRIOR-${i}`,
            skuId: skuWithScheme.id,
            skuCode: skuWithScheme.code,
            skuName: skuWithScheme.name,
            quantityCases: 2,
            freeCases: 0,
            unitDealerPrice: 500,
            discountPct: 0,
            discountAmount: 0,
            netLineAmount: 1000,
            gstRate: 18,
            gstAmount: 180,
          },
          {
            id: `item_prior_${i}_2`,
            orderId: `ORD-PRIOR-${i}`,
            skuId: skuNoScheme.id,
            skuCode: skuNoScheme.code,
            skuName: skuNoScheme.name,
            quantityCases: 2,
            freeCases: 0,
            unitDealerPrice: 500,
            discountPct: 0,
            discountAmount: 0,
            netLineAmount: 1000,
            gstRate: 18,
            gstAmount: 180,
          },
        ]
      );
    }

    const prior = retailerPriorEngine.getPrior(testRetailerId, skuNoScheme.id);
    expect(prior.isEstablished).toBe(true);
    expect(prior.orderCount).toBe(3);
    expect(prior.medianCases).toBe(2);
    expect(prior.historicalMaxCases).toBe(2);

    // 1. Normal order (2 cases): NO warning
    const normalAnomaly = retailerPriorEngine.detectQuantityAnomaly(testRetailerId, skuNoScheme, 2);
    expect(normalAnomaly.isAnomaly).toBe(false);

    // 2. 10x slip (20 cases on non-scheme SKU): triggers anomaly warning
    const slipAnomaly = retailerPriorEngine.detectQuantityAnomaly(testRetailerId, skuNoScheme, 20);
    expect(slipAnomaly.isAnomaly).toBe(true);
    expect(slipAnomaly.warningMessage).toBeDefined();
    expect(slipAnomaly.schemeSuppressed).toBe(false);

    // 3. Scheme Threshold Exception: ordering 10 cases to hit Buy 10 scheme suppresses warning
    const schemeQty = skuWithScheme.schemeDetail?.buyQty || 10;
    const schemeAnomaly = retailerPriorEngine.detectQuantityAnomaly(testRetailerId, skuWithScheme, schemeQty);
    expect(schemeAnomaly.isAnomaly).toBe(false);
    expect(schemeAnomaly.schemeSuppressed).toBe(true);
  });

  it("verifies ultra-low latency (< 0.05ms per inference vector)", () => {
    const testVec = (parityVectors as ParityVector[])[0].features;
    const runs = 2000;

    const start = performance.now();
    for (let i = 0; i < runs; i++) {
      learnedScorer.scoreVector(testVec);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / runs;

    console.log(`Runtime Inference Speed: ${avgMs.toFixed(5)} ms/vector (${Math.round(1000 / avgMs)} inferences/sec)`);
    expect(avgMs).toBeLessThan(0.05); // Way under 0.1ms budget
  });
});
