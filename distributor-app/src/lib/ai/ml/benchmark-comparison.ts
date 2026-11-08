import * as fs from "fs";
import * as path from "path";
import { MASTER_CATALOG_SKUS } from "@/db/master-data";
import { dbStore } from "@/db/store";
import { parseSingleUtterance } from "../text-parser";
import { defaultCalibratedScorer } from "../calibrated-scorer";
import { learnedScorer } from "./learned-scorer";
import { retailerPriorEngine } from "./retailer-prior";
import { DatasetRow } from "./export-dataset";

interface BenchmarkResult {
  engineName: string;
  totalCases: number;
  top1Accuracy: number;
  top3Recall: number;
  autoConfirmedCount: number;
  autoConfirmRate: number;
  autoConfirmPrecision: number;
  autoConfirmErrors: number;
  unitAskRate: number;
  ece: number;
  avgLatencyMs: number;
  quantityAnomalyAlarms: number;
  quantityAnomalyFalseAlarms: number;
}

export function computeEce(probs: number[], labels: number[], nBins: number = 10): number {
  const binLimits: number[] = [];
  for (let i = 0; i <= nBins; i++) {
    binLimits.push(i / nBins);
  }

  let ece = 0;
  const n = probs.length;

  for (let i = 0; i < nBins; i++) {
    const low = binLimits[i];
    const high = binLimits[i + 1];

    const binIndices: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === nBins - 1 ? probs[j] >= low && probs[j] <= high : probs[j] >= low && probs[j] < high) {
        binIndices.push(j);
      }
    }

    if (binIndices.length === 0) continue;

    const binAcc = binIndices.reduce((acc, idx) => acc + labels[idx], 0) / binIndices.length;
    const binConf = binIndices.reduce((acc, idx) => acc + probs[idx], 0) / binIndices.length;
    ece += (binIndices.length / n) * Math.abs(binAcc - binConf);
  }

  return Math.round(ece * 10000) / 10000;
}

export function runComprehensiveBenchmark() {
  console.log("=".repeat(70));
  console.log("Running Comparative Benchmark: Current Heuristic Engine vs Upgraded Learned Scorer");
  console.log("=".repeat(70));

  const dataDir = path.resolve(__dirname, "data");
  const valRows: DatasetRow[] = fs
    .readFileSync(path.join(dataDir, "val.jsonl"), "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const testRows: DatasetRow[] = fs
    .readFileSync(path.join(dataDir, "test.jsonl"), "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const evaluationRows = [...valRows, ...testRows];
  console.log(`Loaded ${evaluationRows.length} held-out evaluation samples (Templates 19-28).`);

  // 1. Evaluate Current / Baseline Heuristic Engine
  console.log("\nEvaluating Current Heuristic Engine (Static Weights + Heuristic Confidence)...");
  const t0_baseline = performance.now();

  let baselineTop1 = 0;
  let baselineTop3 = 0;
  let baselineAutoConfirmCount = 0;
  let baselineAutoConfirmCorrect = 0;
  let baselineAutoConfirmErrors = 0;
  let baselineUnitAsks = 0;
  const baselineProbs: number[] = [];
  const baselineLabels: number[] = [];

  for (const row of evaluationRows) {
    const parsed = parseSingleUtterance(row.utterance, MASTER_CATALOG_SKUS);
    const isTargetCatalog = row.targetSkuId !== null;
    const top1Match = parsed.matchedSku && isTargetCatalog && parsed.matchedSku.id === row.targetSkuId;
    const top3Match =
      isTargetCatalog && parsed.candidates.slice(0, 3).some((c) => c.sku.id === row.targetSkuId);

    if (top1Match) baselineTop1++;
    if (top3Match) baselineTop3++;

    const isAmbigUnit = parsed.extractedUnit === "DABBA" || parsed.extractedUnit === "UNKNOWN";
    if (isAmbigUnit) baselineUnitAsks++;

    // Baseline auto-confirm: confidence >= 0.85 and matchedSku != null and not ambiguous
    const isAutoConfirmed = parsed.confidence >= 0.85 && parsed.matchedSku !== null && !parsed.isAmbiguous;
    if (isAutoConfirmed) {
      baselineAutoConfirmCount++;
      if (top1Match) {
        baselineAutoConfirmCorrect++;
      } else {
        baselineAutoConfirmErrors++;
      }
    }

    baselineProbs.push(parsed.confidence);
    baselineLabels.push(top1Match ? 1 : 0);
  }

  const baselineTimeMs = performance.now() - t0_baseline;
  const baselineAvgLatency = baselineTimeMs / evaluationRows.length;
  const baselineEce = computeEce(baselineProbs, baselineLabels);

  const baselineMetrics: BenchmarkResult = {
    engineName: "Baseline (Current Heuristic Engine)",
    totalCases: evaluationRows.length,
    top1Accuracy: Math.round((baselineTop1 / evaluationRows.length) * 1000) / 10,
    top3Recall: Math.round((baselineTop3 / evaluationRows.length) * 1000) / 10,
    autoConfirmedCount: baselineAutoConfirmCount,
    autoConfirmRate: Math.round((baselineAutoConfirmCount / evaluationRows.length) * 1000) / 10,
    autoConfirmPrecision:
      baselineAutoConfirmCount > 0
        ? Math.round((baselineAutoConfirmCorrect / baselineAutoConfirmCount) * 1000) / 10
        : 100.0,
    autoConfirmErrors: baselineAutoConfirmErrors,
    unitAskRate: Math.round((baselineUnitAsks / evaluationRows.length) * 1000) / 10,
    ece: baselineEce,
    avgLatencyMs: Math.round(baselineAvgLatency * 1000) / 1000,
    quantityAnomalyAlarms: 0,
    quantityAnomalyFalseAlarms: 0,
  };

  // 2. Evaluate Upgraded Learned Engine (12-feature LR + Platt Calibration + 95% Wilson LCB + Prior)
  console.log("Evaluating Upgraded Learned Engine (12-dim Learned Scorer + Platt + LCB Threshold)...");
  const t0_upgraded = performance.now();

  let upgradedTop1 = 0;
  let upgradedTop3 = 0;
  let upgradedAutoConfirmCount = 0;
  let upgradedAutoConfirmCorrect = 0;
  let upgradedAutoConfirmErrors = 0;
  let upgradedUnitAsks = 0;
  const upgradedProbs: number[] = [];
  const upgradedLabels: number[] = [];

  for (const row of evaluationRows) {
    const parsed = parseSingleUtterance(row.utterance, MASTER_CATALOG_SKUS);
    const topSku = parsed.candidates[0]?.sku || MASTER_CATALOG_SKUS[0];
    const s1 = parsed.candidates[0]?.score || 0;
    const s2 = parsed.candidates[1]?.score || 0;
    const aliasHit = parsed.confidence >= 0.98 && parsed.source === "rules";

    const pred = learnedScorer.predict({
      utterance: row.utterance,
      candidateSku: topSku,
      s1_top_score: s1,
      s2_runner_up_score: s2,
      aliasHit,
      unit: parsed.extractedUnit,
      quantity: parsed.extractedQty,
      retailerId: row.retailerId,
    });

    const isTargetCatalog = row.targetSkuId !== null;
    const top1Match = parsed.matchedSku && isTargetCatalog && parsed.matchedSku.id === row.targetSkuId;
    const top3Match =
      isTargetCatalog && parsed.candidates.slice(0, 3).some((c) => c.sku.id === row.targetSkuId);

    if (top1Match) upgradedTop1++;
    if (top3Match) upgradedTop3++;

    if (pred.isAmbiguousUnit) upgradedUnitAsks++;

    if (pred.autoConfirm) {
      upgradedAutoConfirmCount++;
      if (top1Match) {
        upgradedAutoConfirmCorrect++;
      } else {
        upgradedAutoConfirmErrors++;
      }
    }

    upgradedProbs.push(pred.calibratedProb);
    upgradedLabels.push(top1Match ? 1 : 0);
  }

  const upgradedTimeMs = performance.now() - t0_upgraded;
  const upgradedAvgLatency = upgradedTimeMs / evaluationRows.length;
  const upgradedEce = computeEce(upgradedProbs, upgradedLabels);

  // Anomaly evaluation on injected slip dataset (100 synthetic slips: 50 real slips, 30 normal, 20 scheme promos)
  let simulatedAnomalyAlarms = 0;
  let simulatedAnomalyFalseAlarms = 0;
  const fakeRetailer = "RET-0001";
  const skuWithScheme = MASTER_CATALOG_SKUS.find((s) => s.schemeType === "FREE_GOODS") || MASTER_CATALOG_SKUS[0];

  // 50 real 10x slips
  for (let i = 0; i < 50; i++) {
    const res = retailerPriorEngine.detectQuantityAnomaly(fakeRetailer, skuWithScheme, 25);
    if (res.isAnomaly) simulatedAnomalyAlarms++;
  }
  // 30 normal orders
  for (let i = 0; i < 30; i++) {
    const res = retailerPriorEngine.detectQuantityAnomaly(fakeRetailer, skuWithScheme, 2);
    if (res.isAnomaly) simulatedAnomalyFalseAlarms++;
  }
  // 20 promotional scheme orders (hits buyQty = 10)
  for (let i = 0; i < 20; i++) {
    const res = retailerPriorEngine.detectQuantityAnomaly(fakeRetailer, skuWithScheme, 10);
    if (res.isAnomaly) simulatedAnomalyFalseAlarms++; // Scheme suppression prevents false alarm!
  }

  const upgradedMetrics: BenchmarkResult = {
    engineName: "Upgraded Learned Engine (P0 Complete)",
    totalCases: evaluationRows.length,
    top1Accuracy: Math.round((upgradedTop1 / evaluationRows.length) * 1000) / 10,
    top3Recall: Math.round((upgradedTop3 / evaluationRows.length) * 1000) / 10,
    autoConfirmedCount: upgradedAutoConfirmCount,
    autoConfirmRate: Math.round((upgradedAutoConfirmCount / evaluationRows.length) * 1000) / 10,
    autoConfirmPrecision:
      upgradedAutoConfirmCount > 0
        ? Math.round((upgradedAutoConfirmCorrect / upgradedAutoConfirmCount) * 1000) / 10
        : 100.0,
    autoConfirmErrors: upgradedAutoConfirmErrors,
    unitAskRate: Math.round((upgradedUnitAsks / evaluationRows.length) * 1000) / 10,
    ece: upgradedEce,
    avgLatencyMs: Math.round(upgradedAvgLatency * 1000) / 1000,
    quantityAnomalyAlarms: simulatedAnomalyAlarms,
    quantityAnomalyFalseAlarms: simulatedAnomalyFalseAlarms,
  };

  console.log("\n" + "=".repeat(70));
  console.log("BENCHMARK COMPARISON RESULTS:");
  console.log("=".repeat(70));
  console.table([baselineMetrics, upgradedMetrics]);

  return { baselineMetrics, upgradedMetrics };
}

if (require.main === module) {
  runComprehensiveBenchmark();
}
