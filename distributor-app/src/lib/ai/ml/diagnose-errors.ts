import * as fs from "fs";
import * as path from "path";
import { MASTER_CATALOG_SKUS } from "@/db/master-data";
import { parseSingleUtterance } from "../text-parser";
import { learnedScorer } from "./learned-scorer";
import { DatasetRow } from "./export-dataset";

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

const allRows = [...valRows, ...testRows];

const baselineErrors = [];
for (const r of allRows) {
  const parsed = parseSingleUtterance(r.utterance, MASTER_CATALOG_SKUS);
  const isAuto = parsed.confidence >= 0.85 && parsed.matchedSku !== null && !parsed.isAmbiguous;
  const isTargetCatalog = r.targetSkuId !== null;
  const isCorrect = isTargetCatalog && parsed.matchedSku && parsed.matchedSku.id === r.targetSkuId;

  if (isAuto && !isCorrect) {
    const s1 = parsed.candidates[0]?.score || 0;
    const s2 = parsed.candidates[1]?.score || 0;
    const pred = learnedScorer.predict({
      utterance: r.utterance,
      candidateSku: parsed.candidates[0]?.sku || MASTER_CATALOG_SKUS[0],
      s1_top_score: s1,
      s2_runner_up_score: s2,
      aliasHit: false,
      unit: parsed.extractedUnit,
      quantity: parsed.extractedQty,
      retailerId: r.retailerId,
    });

    baselineErrors.push({
      utterance: r.utterance,
      targetSkuId: r.targetSkuId,
      targetName: MASTER_CATALOG_SKUS.find((s) => s.id === r.targetSkuId)?.name,
      baselineMatched: parsed.matchedSku ? parsed.matchedSku.id : null,
      baselineMatchedName: parsed.matchedSku ? parsed.matchedSku.name : null,
      baselineConfidence: parsed.confidence,
      upgradedProb: pred.calibratedProb,
      upgradedDecision: pred.decision,
      upgradedAutoConfirm: pred.autoConfirm,
      runnerUpSku: parsed.candidates[1]?.sku?.name,
    });
  }
}

console.log(`Total Baseline Auto-Confirm Errors: ${baselineErrors.length} / ${allRows.length}`);
baselineErrors.slice(0, 10).forEach((e, idx) => {
  console.log(`\nCase #${idx + 1}: "${e.utterance}"`);
  console.log(`  Expected SKU:   ${e.targetSkuId} (${e.targetName})`);
  console.log(`  Baseline Matched: ${e.baselineMatched} (${e.baselineMatchedName}) [Confidence: ${(e.baselineConfidence * 100).toFixed(1)}%] -> FALSE AUTO-CONFIRM`);
  console.log(`  Upgraded Model: Calibrated Prob: ${(e.upgradedProb * 100).toFixed(1)}% | Decision: ${e.upgradedDecision} | AutoConfirm: ${e.upgradedAutoConfirm}`);
});
