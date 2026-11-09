import * as fs from "fs";
import * as path from "path";
import { MASTER_CATALOG_SKUS } from "@/db/master-data";
import { dbStore } from "@/db/store";
import { parseSingleUtterance } from "../text-parser";
import { defaultCalibratedScorer } from "../calibrated-scorer";
import { learnedScorer, LOOK_ALIKE_FAMILY_SKUS } from "./learned-scorer";
import { retailerPriorEngine } from "./retailer-prior";
import { packSizeExtractor } from "./pack-size-extractor";
import { EvalPrompt } from "./queries/generate-eval-prompts";
import { DatasetRow } from "./export-dataset";

interface EngineEvaluation {
  matchedSkuId: string | null;
  matchedSkuName: string | null;
  confidence: number;
  autoConfirm: boolean;
  decision: string;
  isCorrect: boolean;
}

export interface ThreeWayBenchmarkRow {
  queryId: string;
  category: string;
  utterance: string;
  targetSkuId: string | null;
  targetSkuName: string | null;
  engine1_baseline: EngineEvaluation;
  engine2_v2_learned: EngineEvaluation;
  engine3_v3_enhanced: EngineEvaluation;
  e3_warningFlagged?: boolean;
  e3_warningReason?: string;
  tradeScenario?: string;
}

export interface AggregateEngineMetrics {
  engineName: string;
  totalQueries: number;
  inCatalogQueries: number;
  top1AccuracyPct: number;
  top1InCatalogPct: number;
  top3RecallPct: number;
  autoConfirmedCount: number;
  autoConfirmCoveragePct: number;
  autoConfirmPrecisionPct: number;
  autoConfirmWilsonLcb95: number;
  autoConfirmErrors: number;
  unitAskRatePct: number;
  ece: number;
  avgLatencyMs: number;
}

/**
 * Wilson score 95% lower confidence bound for binomial proportion
 */
export function computeWilsonLcb95(k: number, n: number): number {
  if (n === 0) return 1.0;
  const p = k / n;
  const z = 1.95996; // 95% confidence
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  const lcb = (center - spread) / denominator;
  return Math.max(0, Math.round(lcb * 1000) / 1000);
}

export function computeEce(probs: number[], labels: number[], nBins: number = 10): number {
  const binLimits: number[] = [];
  for (let i = 0; i <= nBins; i++) binLimits.push(i / nBins);
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

export function runThreeWayBenchmark() {
  console.log("=".repeat(80));
  console.log("RUNNING 3-WAY COMPARATIVE BENCHMARK");
  console.log("1. Baseline Heuristic Engine (Current App in Production)");
  console.log("2. V2 Learned Scorer (Initial P0 Upgrade with Platt Calibration)");
  console.log("3. V3 Enhanced Learned Scorer (Pack-Size Extractor + Adaptive Segmented Thresholds)");
  console.log("=".repeat(80));

  // Initialize DB store baseline
  dbStore.reset(true);

  // Seed historical orders for RET-PRIOR-TEST to establish retailer prior baseline (median = 2 cases, max = 2 cases)
  const testRetailerId = "RET-PRIOR-TEST";
  const parleSku = MASTER_CATALOG_SKUS.find((s) => s.id === "SKU-BS-PG075") || MASTER_CATALOG_SKUS[0];
  const dettolSku = MASTER_CATALOG_SKUS.find((s) => s.id === "SKU-PC-DT075") || MASTER_CATALOG_SKUS[0];
  const ghadiSku = MASTER_CATALOG_SKUS.find((s) => s.id === "SKU-DT-GH1KG") || MASTER_CATALOG_SKUS[0];

  for (let i = 1; i <= 3; i++) {
    dbStore.createOrder(
      {
        id: `ORD-PRIOR-${i}`,
        retailerId: testRetailerId,
        placedBy: "Test Retailer",
        status: "VERIFIED",
        subtotal: 2500,
        schemeDiscount: 0,
        taxableAmount: 2500,
        totalGst: 450,
        grandTotal: 2950,
        freeGoodsTally: [],
        occVersion: 1,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      [
        {
          id: `item_prior_${i}_1`,
          orderId: `ORD-PRIOR-${i}`,
          skuId: parleSku.id,
          skuCode: parleSku.code,
          skuName: parleSku.name,
          quantityCases: 2,
          freeCases: 0,
          unitDealerPrice: 777.6,
          discountPct: 0,
          discountAmount: 0,
          netLineAmount: 1555.2,
          gstRate: 18,
          gstAmount: 279.94,
        },
        {
          id: `item_prior_${i}_2`,
          orderId: `ORD-PRIOR-${i}`,
          skuId: dettolSku.id,
          skuCode: dettolSku.code,
          skuName: dettolSku.name,
          quantityCases: 2,
          freeCases: 0,
          unitDealerPrice: 878.4,
          discountPct: 0,
          discountAmount: 0,
          netLineAmount: 1756.8,
          gstRate: 18,
          gstAmount: 316.22,
        },
        {
          id: `item_prior_${i}_3`,
          orderId: `ORD-PRIOR-${i}`,
          skuId: ghadiSku.id,
          skuCode: ghadiSku.code,
          skuName: ghadiSku.name,
          quantityCases: 3,
          freeCases: 0,
          unitDealerPrice: 940,
          discountPct: 0,
          discountAmount: 0,
          netLineAmount: 2820,
          gstRate: 18,
          gstAmount: 507.60,
        },
      ]
    );
  }

  // Load curated evaluation prompts
  const queriesPath = path.resolve(__dirname, "queries", "eval_prompts.json");
  const curatedPrompts: EvalPrompt[] = JSON.parse(fs.readFileSync(queriesPath, "utf-8"));

  // Load held-out synthetic evaluation rows
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

  // Combine into unified evaluation suite (444 total queries)
  const combinedQueries: Array<{
    id: string;
    category: string;
    utterance: string;
    targetSkuId: string | null;
    targetSkuName: string | null;
    retailerId: string;
    tradeScenario?: string;
  }> = [
    ...curatedPrompts.map((p) => ({
      id: p.id,
      category: p.category,
      utterance: p.utterance,
      targetSkuId: p.targetSkuId,
      targetSkuName: p.targetSkuName,
      retailerId: p.retailerId,
      tradeScenario: p.tradeScenario,
    })),
    ...valRows.map((r, i) => ({
      id: `SYN-VAL-${String(i + 1).padStart(3, "0")}`,
      category: "HELD_OUT_SYNTHETIC_VAL",
      utterance: r.utterance,
      targetSkuId: r.targetSkuId,
      targetSkuName: MASTER_CATALOG_SKUS.find((s) => s.id === r.targetSkuId)?.name || null,
      retailerId: r.retailerId,
      tradeScenario: `Synthetic held-out template (${r.templateId})`,
    })),
    ...testRows.map((r, i) => ({
      id: `SYN-TEST-${String(i + 1).padStart(3, "0")}`,
      category: "HELD_OUT_SYNTHETIC_TEST",
      utterance: r.utterance,
      targetSkuId: r.targetSkuId,
      targetSkuName: MASTER_CATALOG_SKUS.find((s) => s.id === r.targetSkuId)?.name || null,
      retailerId: r.retailerId,
      tradeScenario: `Synthetic held-out template (${r.templateId})`,
    })),
  ];

  console.log(`Loaded ${combinedQueries.length} total test queries across all 8 trade categories.`);

  const detailedRows: ThreeWayBenchmarkRow[] = [];

  // Metrics trackers
  let e1_top1 = 0, e1_top3 = 0, e1_autoCount = 0, e1_autoCorrect = 0, e1_autoErrors = 0, e1_unitAsks = 0;
  let e2_top1 = 0, e2_top3 = 0, e2_autoCount = 0, e2_autoCorrect = 0, e2_autoErrors = 0, e2_unitAsks = 0;
  let e3_top1 = 0, e3_top3 = 0, e3_autoCount = 0, e3_autoCorrect = 0, e3_autoErrors = 0, e3_unitAsks = 0;

  let e1_totalLatencyMs = 0;
  let e2_totalLatencyMs = 0;
  let e3_totalLatencyMs = 0;

  const e1_probs: number[] = [], e1_labels: number[] = [];
  const e2_probs: number[] = [], e2_labels: number[] = [];
  const e3_probs: number[] = [], e3_labels: number[] = [];

  for (const q of combinedQueries) {
    const isTargetCatalog = q.targetSkuId !== null;

    // --- ENGINE 1: Baseline Heuristic Engine ---
    // Deterministic parsing without pack-size reranking + Heuristic Calibrated Confidence Scorer
    const t0_e1 = performance.now();
    const parsed_e1 = parseSingleUtterance(q.utterance, MASTER_CATALOG_SKUS, undefined, {
      enablePackSizeExtractor: false,
    });
    const e1_latency = performance.now() - t0_e1;
    e1_totalLatencyMs += e1_latency;

    const e1_matched = parsed_e1.matchedSku;
    const e1_isCorrect = isTargetCatalog && e1_matched !== null && e1_matched.id === q.targetSkuId;
    const e1_top3Correct =
      isTargetCatalog && parsed_e1.candidates.slice(0, 3).some((c) => c.sku.id === q.targetSkuId);

    if (e1_isCorrect) e1_top1++;
    if (e1_top3Correct) e1_top3++;

    const e1_isAmbigUnit = parsed_e1.extractedUnit === "DABBA" || parsed_e1.extractedUnit === "UNKNOWN";
    if (e1_isAmbigUnit) e1_unitAsks++;

    // Baseline heuristic rule: confidence >= 0.85 and matchedSku != null and not ambiguous
    const e1_autoConfirm = parsed_e1.confidence >= 0.85 && e1_matched !== null && !parsed_e1.isAmbiguous;
    if (e1_autoConfirm) {
      e1_autoCount++;
      if (e1_isCorrect) e1_autoCorrect++;
      else e1_autoErrors++;
    }

    e1_probs.push(parsed_e1.confidence);
    e1_labels.push(e1_isCorrect ? 1 : 0);

    const eval_e1: EngineEvaluation = {
      matchedSkuId: e1_matched?.id || null,
      matchedSkuName: e1_matched?.name || null,
      confidence: Math.round(parsed_e1.confidence * 100) / 100,
      autoConfirm: e1_autoConfirm,
      decision: e1_autoConfirm ? "AUTO_CONFIRM" : e1_isAmbigUnit ? "DISAMBIGUATION" : "MANUAL_CONFIRM",
      isCorrect: e1_isCorrect,
    };

    // --- ENGINE 2: V2 Learned Scorer (Initial P0 Upgrade) ---
    // Baseline retrieval (no extractor) + 12-dim features + Flat threshold 0.945
    const t0_e2 = performance.now();
    const topSku_e2 = parsed_e1.candidates[0]?.sku || MASTER_CATALOG_SKUS[0];
    const s1_e2 = parsed_e1.candidates[0]?.score || 0;
    const s2_e2 = parsed_e1.candidates[1]?.score || 0;
    const aliasHit_e2 = parsed_e1.confidence >= 0.98 && parsed_e1.source === "rules";

    const v2_pred = learnedScorer.predict({
      utterance: q.utterance,
      candidateSku: topSku_e2,
      s1_top_score: s1_e2,
      s2_runner_up_score: s2_e2,
      aliasHit: aliasHit_e2,
      unit: parsed_e1.extractedUnit,
      quantity: parsed_e1.extractedQty,
      retailerId: q.retailerId,
    });
    const e2_latency = performance.now() - t0_e2 + e1_latency;
    e2_totalLatencyMs += e2_latency;

    // In V2, flat threshold 0.945 was strictly used
    const e2_autoConfirm = v2_pred.calibratedProb >= 0.945 && !v2_pred.isAmbiguousUnit;
    const e2_isCorrect = isTargetCatalog && parsed_e1.matchedSku !== null && parsed_e1.matchedSku.id === q.targetSkuId;

    if (e2_isCorrect) e2_top1++;
    if (e1_top3Correct) e2_top3++;
    if (v2_pred.isAmbiguousUnit) e2_unitAsks++;

    if (e2_autoConfirm) {
      e2_autoCount++;
      if (e2_isCorrect) e2_autoCorrect++;
      else e2_autoErrors++;
    }

    e2_probs.push(v2_pred.calibratedProb);
    e2_labels.push(e2_isCorrect ? 1 : 0);

    const eval_e2: EngineEvaluation = {
      matchedSkuId: parsed_e1.matchedSku?.id || null,
      matchedSkuName: parsed_e1.matchedSku?.name || null,
      confidence: Math.round(v2_pred.calibratedProb * 100) / 100,
      autoConfirm: e2_autoConfirm,
      decision: e2_autoConfirm ? "AUTO_CONFIRM" : v2_pred.decision,
      isCorrect: e2_isCorrect,
    };

    // --- ENGINE 3: V3 Enhanced Learned Scorer (New Improved Engine) ---
    // Pack-Size Extractor Grounding + Domain Retrieval + Segmented Adaptive Thresholds + Soft Slip Guard
    const t0_e3 = performance.now();
    const parsed_e3 = parseSingleUtterance(q.utterance, MASTER_CATALOG_SKUS, undefined, {
      enablePackSizeExtractor: true,
    });

    const topSku_e3 = parsed_e3.candidates[0]?.sku || null;
    const s1_e3 = parsed_e3.candidates[0]?.score || 0;
    const s2_e3 = parsed_e3.candidates[1]?.score || 0;
    const aliasHit_e3 = parsed_e3.confidence >= 0.98 && parsed_e3.source === "rules";

    const v3_pred = topSku_e3
      ? learnedScorer.predict({
          utterance: q.utterance,
          candidateSku: topSku_e3,
          s1_top_score: s1_e3,
          s2_runner_up_score: s2_e3,
          aliasHit: aliasHit_e3,
          unit: parsed_e3.extractedUnit,
          quantity: parsed_e3.extractedQty,
          retailerId: q.retailerId,
        })
      : null;

    // Evaluate pack-size grounding
    const sizeRes = topSku_e3
      ? packSizeExtractor.evaluateMatch(q.utterance, topSku_e3.packSize, topSku_e3.id)
      : { score: 0 };
    const isSizeMismatch = sizeRes.score < 0;

    // Evaluate retailer prior quantity slip guard
    let e3_warningFlagged = false;
    let e3_warningReason = "NONE";

    if (topSku_e3 && parsed_e3.extractedQty && parsed_e3.extractedQty > 0) {
      const qtyCases =
        parsed_e3.extractedUnit === "CASE"
          ? parsed_e3.extractedQty
          : Math.ceil(parsed_e3.extractedQty / (topSku_e3.unitsPerCase || 1));
      const anomaly = retailerPriorEngine.detectQuantityAnomaly(q.retailerId, topSku_e3, qtyCases);
      if (anomaly.isAnomaly) {
        e3_warningFlagged = true;
        e3_warningReason = anomaly.warningMessage || `Quantity outlier: ${qtyCases} cases exceeds 3x median`;
      } else if (anomaly.schemeSuppressed) {
        e3_warningReason = `Scheme promo match (Buy ${topSku_e3.schemeDetail?.buyQty || 10} Get 1) - warning suppressed`;
      } else {
        e3_warningReason = "Normal habitual quantity";
      }
    }

    const isFamilySku = topSku_e3 ? LOOK_ALIKE_FAMILY_SKUS.has(topSku_e3.id) : false;
    const e3_threshold = isFamilySku ? 0.945 : 0.75;

    const e3_matched = parsed_e3.matchedSku;
    const e3_isCorrect = isTargetCatalog && e3_matched !== null && e3_matched.id === q.targetSkuId;
    const e3_top3Correct =
      isTargetCatalog && parsed_e3.candidates.slice(0, 3).some((c) => c.sku.id === q.targetSkuId);

    if (e3_isCorrect) e3_top1++;
    if (e3_top3Correct) e3_top3++;

    const isAmbigUnit_e3 =
      v3_pred?.isAmbiguousUnit ??
      (parsed_e3.extractedUnit === "DABBA" || parsed_e3.extractedUnit === "UNKNOWN");
    if (isAmbigUnit_e3) e3_unitAsks++;

    const e3_prob = v3_pred?.calibratedProb ?? 0;
    const e3_autoConfirm =
      v3_pred !== null &&
      e3_prob >= e3_threshold &&
      !isAmbigUnit_e3 &&
      !isSizeMismatch &&
      !e3_warningFlagged;

    if (e3_autoConfirm) {
      e3_autoCount++;
      if (e3_isCorrect) e3_autoCorrect++;
      else e3_autoErrors++;
    }

    e3_probs.push(e3_prob);
    e3_labels.push(e3_isCorrect ? 1 : 0);

    const e3_latency = performance.now() - t0_e3;
    e3_totalLatencyMs += e3_latency;

    const eval_e3: EngineEvaluation = {
      matchedSkuId: e3_matched?.id || null,
      matchedSkuName: e3_matched?.name || null,
      confidence: Math.round(e3_prob * 100) / 100,
      autoConfirm: e3_autoConfirm,
      decision: e3_autoConfirm
        ? "AUTO_CONFIRM"
        : e3_warningFlagged
        ? "SUGGEST_TOP2"
        : isAmbigUnit_e3
        ? "ASK_UNIT"
        : isSizeMismatch
        ? "SUGGEST_TOP2"
        : v3_pred?.decision || "DESK_CONFIRM",
      isCorrect: e3_isCorrect,
    };

    detailedRows.push({
      queryId: q.id,
      category: q.category,
      utterance: q.utterance,
      targetSkuId: q.targetSkuId,
      targetSkuName: q.targetSkuName,
      engine1_baseline: eval_e1,
      engine2_v2_learned: eval_e2,
      engine3_v3_enhanced: eval_e3,
      e3_warningFlagged,
      e3_warningReason,
      tradeScenario: q.tradeScenario,
    });
  }

  // Aggregate Metrics Computation
  const N = combinedQueries.length;
  const inCatalogN = combinedQueries.filter((q) => q.targetSkuId !== null).length;

  const metrics_e1: AggregateEngineMetrics = {
    engineName: "1. Baseline Heuristic Engine (Original V1)",
    totalQueries: N,
    inCatalogQueries: inCatalogN,
    top1AccuracyPct: Math.round((e1_top1 / N) * 1000) / 10,
    top1InCatalogPct: Math.round((e1_top1 / inCatalogN) * 1000) / 10,
    top3RecallPct: Math.round((e1_top3 / inCatalogN) * 1000) / 10,
    autoConfirmedCount: e1_autoCount,
    autoConfirmCoveragePct: Math.round((e1_autoCount / N) * 1000) / 10,
    autoConfirmPrecisionPct: e1_autoCount > 0 ? Math.round((e1_autoCorrect / e1_autoCount) * 1000) / 10 : 100.0,
    autoConfirmWilsonLcb95: computeWilsonLcb95(e1_autoCorrect, e1_autoCount),
    autoConfirmErrors: e1_autoErrors,
    unitAskRatePct: Math.round((e1_unitAsks / N) * 1000) / 10,
    ece: computeEce(e1_probs, e1_labels),
    avgLatencyMs: Math.round((e1_totalLatencyMs / N) * 100) / 100,
  };

  const metrics_e2: AggregateEngineMetrics = {
    engineName: "2. Intermediate Learned Scorer (V2 Upgrade)",
    totalQueries: N,
    inCatalogQueries: inCatalogN,
    top1AccuracyPct: Math.round((e2_top1 / N) * 1000) / 10,
    top1InCatalogPct: Math.round((e2_top1 / inCatalogN) * 1000) / 10,
    top3RecallPct: Math.round((e2_top3 / inCatalogN) * 1000) / 10,
    autoConfirmedCount: e2_autoCount,
    autoConfirmCoveragePct: Math.round((e2_autoCount / N) * 1000) / 10,
    autoConfirmPrecisionPct: e2_autoCount > 0 ? Math.round((e2_autoCorrect / e2_autoCount) * 1000) / 10 : 100.0,
    autoConfirmWilsonLcb95: computeWilsonLcb95(e2_autoCorrect, e2_autoCount),
    autoConfirmErrors: e2_autoErrors,
    unitAskRatePct: Math.round((e2_unitAsks / N) * 1000) / 10,
    ece: computeEce(e2_probs, e2_labels),
    avgLatencyMs: Math.round((e2_totalLatencyMs / N) * 100) / 100,
  };

  const metrics_e3: AggregateEngineMetrics = {
    engineName: "3. Enhanced Learned Scorer (V3 Production App on Main)",
    totalQueries: N,
    inCatalogQueries: inCatalogN,
    top1AccuracyPct: Math.round((e3_top1 / N) * 1000) / 10,
    top1InCatalogPct: Math.round((e3_top1 / inCatalogN) * 1000) / 10,
    top3RecallPct: Math.round((e3_top3 / inCatalogN) * 1000) / 10,
    autoConfirmedCount: e3_autoCount,
    autoConfirmCoveragePct: Math.round((e3_autoCount / N) * 1000) / 10,
    autoConfirmPrecisionPct: e3_autoCount > 0 ? Math.round((e3_autoCorrect / e3_autoCount) * 1000) / 10 : 100.0,
    autoConfirmWilsonLcb95: computeWilsonLcb95(e3_autoCorrect, e3_autoCount),
    autoConfirmErrors: e3_autoErrors,
    unitAskRatePct: Math.round((e3_unitAsks / N) * 1000) / 10,
    ece: computeEce(e3_probs, e3_labels),
    avgLatencyMs: Math.round((e3_totalLatencyMs / N) * 100) / 100,
  };

  console.log("\n" + "=".repeat(80));
  console.log("3-WAY COMPARATIVE BENCHMARK SUMMARY (444 QUERIES):");
  console.log("=".repeat(80));
  console.table([metrics_e1, metrics_e2, metrics_e3]);

  // Compute slice metrics
  const computeSliceMetrics = (sliceName: string, filterFn: (r: ThreeWayBenchmarkRow) => boolean) => {
    const rows = detailedRows.filter(filterFn);
    const n = rows.length;
    const e2_auto = rows.filter((r) => r.engine2_v2_learned.autoConfirm);
    const e2_corr = e2_auto.filter((r) => r.engine2_v2_learned.isCorrect).length;
    const e3_auto = rows.filter((r) => r.engine3_v3_enhanced.autoConfirm);
    const e3_corr = e3_auto.filter((r) => r.engine3_v3_enhanced.isCorrect).length;

    return {
      slice: sliceName,
      count: n,
      e2_autoConfirmed: e2_auto.length,
      e2_correct: e2_corr,
      e2_precisionPct: e2_auto.length > 0 ? Math.round((e2_corr / e2_auto.length) * 1000) / 10 : 100,
      e2_wilsonLcb95: computeWilsonLcb95(e2_corr, e2_auto.length),
      e3_autoConfirmed: e3_auto.length,
      e3_correct: e3_corr,
      e3_precisionPct: e3_auto.length > 0 ? Math.round((e3_corr / e3_auto.length) * 1000) / 10 : 100,
      e3_wilsonLcb95: computeWilsonLcb95(e3_corr, e3_auto.length),
    };
  };

  const sliceMetrics = [
    computeSliceMetrics("All 444 Queries", () => true),
    computeSliceMetrics("Held-Out Synthetic (Val + Test, n=374)", (r) => r.queryId.startsWith("SYN-")),
    computeSliceMetrics("Synthetic Validation Split (n=246)", (r) => r.queryId.startsWith("SYN-VAL-")),
    computeSliceMetrics("Synthetic Test Split (n=128)", (r) => r.queryId.startsWith("SYN-TEST-")),
    computeSliceMetrics("Curated Prompts (n=70)", (r) => r.queryId.startsWith("PRM-")),
  ];

  console.log("\n" + "=".repeat(80));
  console.log("PRECISION SLICE BREAKDOWN & 95% WILSON CONFIDENCE LOWER BOUNDS:");
  console.log("=".repeat(80));
  console.table(sliceMetrics);

  // Export results to JSON
  const jsonOutputPath = path.join(dataDir, "three_way_benchmark_results.json");
  const exportPayload = {
    benchmarkDate: new Date().toISOString(),
    totalQueries: N,
    engines: [metrics_e1, metrics_e2, metrics_e3],
    slices: sliceMetrics,
    categoryBreakdown: {} as Record<string, any>,
    detailedRows,
  };

  // Group by category for clear per-category metrics
  const categories = Array.from(new Set(detailedRows.map((r) => r.category)));
  for (const cat of categories) {
    const catRows = detailedRows.filter((r) => r.category === cat);
    const cat_e1_err = catRows.filter((r) => r.engine1_baseline.autoConfirm && !r.engine1_baseline.isCorrect).length;
    const cat_e2_err = catRows.filter((r) => r.engine2_v2_learned.autoConfirm && !r.engine2_v2_learned.isCorrect).length;
    const cat_e3_err = catRows.filter((r) => r.engine3_v3_enhanced.autoConfirm && !r.engine3_v3_enhanced.isCorrect).length;

    exportPayload.categoryBreakdown[cat] = {
      count: catRows.length,
      e1_autoConfirmRate: Math.round((catRows.filter((r) => r.engine1_baseline.autoConfirm).length / catRows.length) * 100) + "%",
      e1_errors: cat_e1_err,
      e2_autoConfirmRate: Math.round((catRows.filter((r) => r.engine2_v2_learned.autoConfirm).length / catRows.length) * 100) + "%",
      e2_errors: cat_e2_err,
      e3_autoConfirmRate: Math.round((catRows.filter((r) => r.engine3_v3_enhanced.autoConfirm).length / catRows.length) * 100) + "%",
      e3_errors: cat_e3_err,
    };
  }

  fs.writeFileSync(jsonOutputPath, JSON.stringify(exportPayload, null, 2), "utf-8");
  console.log(`Saved detailed 3-way evaluation results to: ${jsonOutputPath}`);

  // Export results to CSV for easy spreadsheet viewing
  const csvOutputPath = path.join(dataDir, "three_way_benchmark_results.csv");
  const csvHeaders = [
    "QueryID",
    "Category",
    "Utterance",
    "TargetSkuId",
    "TargetSkuName",
    "E1_MatchedSku",
    "E1_Conf",
    "E1_AutoConfirm",
    "E1_Correct",
    "E2_MatchedSku",
    "E2_CalibProb",
    "E2_AutoConfirm",
    "E2_Correct",
    "E3_MatchedSku",
    "E3_CalibProb",
    "E3_AutoConfirm",
    "E3_Correct",
    "E3_WarningFlagged",
    "E3_WarningReason",
    "TradeScenario",
  ];

  const csvLines = [csvHeaders.join(",")];
  for (const r of detailedRows) {
    const sanitize = (str: string | null | undefined) => `"${(str || "").replace(/"/g, '""')}"`;
    csvLines.push(
      [
        r.queryId,
        r.category,
        sanitize(r.utterance),
        r.targetSkuId || "NONE",
        sanitize(r.targetSkuName),
        r.engine1_baseline.matchedSkuId || "NONE",
        r.engine1_baseline.confidence,
        r.engine1_baseline.autoConfirm ? "YES" : "NO",
        r.engine1_baseline.isCorrect ? "TRUE" : "FALSE",
        r.engine2_v2_learned.matchedSkuId || "NONE",
        r.engine2_v2_learned.confidence,
        r.engine2_v2_learned.autoConfirm ? "YES" : "NO",
        r.engine2_v2_learned.isCorrect ? "TRUE" : "FALSE",
        r.engine3_v3_enhanced.matchedSkuId || "NONE",
        r.engine3_v3_enhanced.confidence,
        r.engine3_v3_enhanced.autoConfirm ? "YES" : "NO",
        r.engine3_v3_enhanced.isCorrect ? "TRUE" : "FALSE",
        r.e3_warningFlagged ? "YES" : "NO",
        sanitize(r.e3_warningReason),
        sanitize(r.tradeScenario),
      ].join(",")
    );
  }

  fs.writeFileSync(csvOutputPath, csvLines.join("\n"), "utf-8");
  console.log(`Saved CSV export to: ${csvOutputPath}`);

  return { metrics_e1, metrics_e2, metrics_e3, sliceMetrics, exportPayload };
}

if (require.main === module) {
  runThreeWayBenchmark();
}
