import * as fs from "fs";
import * as path from "path";
import { MASTER_CATALOG_SKUS } from "../../../db/master-data";
import { dbStore } from "../../../db/store";
import { syntheticGenerator, SyntheticSample } from "./synthetic-generator";
import { parseSingleUtterance } from "../text-parser";
import { featureExtractor, FEATURE_NAMES } from "./feature-extractor";
import { retailerPriorEngine } from "./retailer-prior";

const DATA_DIR = path.resolve(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface DatasetRow {
  id: string;
  templateId: string;
  split: "train" | "val" | "test";
  utterance: string;
  retailerId: string;
  targetSkuId: string | null;
  predictedSkuId: string | null;
  label: number; // 1 = correct SKU match, 0 = incorrect / out-of-catalog
  extractedQty: number | null;
  extractedUnit: string;
  isAmbiguousUnit: boolean;
  features: number[];
  featureMap: Record<string, number>;
}

export function buildAndExportDatasets() {
  console.log("1. Generating synthetic samples with 25+ template holdout & look-alike size families...");
  const rawSamples = syntheticGenerator.generateDataset(45); // Generates ~2,500+ diverse samples

  console.log(`Generated ${rawSamples.length} total synthetic samples.`);

  // Initialize DB store baseline
  dbStore.reset(true);
  const retailers = dbStore.getAllRetailers();

  const trainRows: DatasetRow[] = [];
  const valRows: DatasetRow[] = [];
  const testRows: DatasetRow[] = [];

  for (let idx = 0; idx < rawSamples.length; idx++) {
    const sample = rawSamples[idx];
    const retailer = retailers[idx % retailers.length];

    // Run through deterministic parsing & candidate retrieval
    const parsed = parseSingleUtterance(sample.utterance, MASTER_CATALOG_SKUS);

    const s1 = parsed.candidates.length > 0 ? parsed.candidates[0].score : 0.0;
    const s2 = parsed.candidates.length > 1 ? parsed.candidates[1].score : 0.0;
    const topSku = parsed.candidates.length > 0 ? parsed.candidates[0].sku : MASTER_CATALOG_SKUS[0];

    // Compute empirical prior
    const prior = sample.targetSkuId
      ? retailerPriorEngine.getPrior(retailer.id, sample.targetSkuId)
      : undefined;

    // Compute 12-dimensional feature vector
    const { vector, array } = featureExtractor.extract({
      utterance: sample.utterance,
      candidateSku: topSku,
      s1_top_score: s1,
      s2_runner_up_score: s2,
      aliasHit: parsed.confidence >= 0.98 && parsed.source === "rules",
      unit: parsed.extractedUnit,
      quantity: parsed.extractedQty,
      retailerId: retailer.id,
      prior,
    });

    // Ground truth label: 1 if predicted SKU matches target SKU, 0 otherwise
    const isCorrect =
      !sample.isOutOfCatalog &&
      sample.targetSkuId !== null &&
      parsed.matchedSku !== null &&
      parsed.matchedSku.id === sample.targetSkuId;

    const row: DatasetRow = {
      id: sample.id,
      templateId: sample.templateId,
      split: sample.split,
      utterance: sample.utterance,
      retailerId: retailer.id,
      targetSkuId: sample.targetSkuId,
      predictedSkuId: parsed.matchedSku ? parsed.matchedSku.id : null,
      label: isCorrect ? 1 : 0,
      extractedQty: parsed.extractedQty,
      extractedUnit: parsed.extractedUnit,
      isAmbiguousUnit: sample.hasAmbiguousUnit,
      features: array,
      featureMap: vector as unknown as Record<string, number>,
    };

    if (sample.split === "train") {
      trainRows.push(row);
    } else if (sample.split === "val") {
      valRows.push(row);
    } else {
      testRows.push(row);
    }
  }

  // Write JSONL files
  const trainPath = path.join(DATA_DIR, "train.jsonl");
  const valPath = path.join(DATA_DIR, "val.jsonl");
  const testPath = path.join(DATA_DIR, "test.jsonl");

  fs.writeFileSync(trainPath, trainRows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
  fs.writeFileSync(valPath, valRows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
  fs.writeFileSync(testPath, testRows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");

  console.log(`Successfully exported datasets to ${DATA_DIR}:`);
  console.log(`- train.jsonl: ${trainRows.length} rows (Templates 01-18)`);
  console.log(`- val.jsonl: ${valRows.length} rows (Held-out Templates 19-25)`);
  console.log(`- test.jsonl: ${testRows.length} rows (Held-out Templates 26-28)`);
}

if (require.main === module) {
  buildAndExportDatasets();
}
