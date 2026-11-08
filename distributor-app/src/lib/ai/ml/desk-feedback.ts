import * as fs from "fs";
import * as path from "path";
import { dbStore } from "@/db/store";
import { MASTER_CATALOG_SKUS } from "@/db/master-data";
import { parseSingleUtterance } from "../text-parser";
import { featureExtractor } from "./feature-extractor";
import { retailerPriorEngine } from "./retailer-prior";
import { DatasetRow } from "./export-dataset";

const TRAIN_JSONL_PATH = path.resolve(__dirname, "data", "train.jsonl");

export interface DeskCorrectionInput {
  retailerId: string;
  rawPhrase: string;
  correctedSkuId: string;
  quantity?: number;
  unit?: string;
  orderId?: string;
}

export function recordDeskCorrectionFeedback(input: DeskCorrectionInput): {
  aliasSaved: boolean;
  trainingRowAppended: boolean;
} {
  const { retailerId, rawPhrase, correctedSkuId, quantity = 1, unit = "CASE", orderId } = input;
  const cleanPhrase = rawPhrase.trim();
  if (!cleanPhrase) {
    return { aliasSaved: false, trainingRowAppended: false };
  }

  // 1. Feed Retailer Alias Table (Tier 0 Instant Hit)
  dbStore.saveRetailerAlias(retailerId, cleanPhrase, correctedSkuId);

  // 2. Feed Training Rows (Feature Extraction with Ground Truth = 1)
  try {
    const candidateSku =
      MASTER_CATALOG_SKUS.find((s) => s.id === correctedSkuId || s.code === correctedSkuId) ||
      dbStore.getSkuById(correctedSkuId);

    if (candidateSku) {
      const parsed = parseSingleUtterance(cleanPhrase, MASTER_CATALOG_SKUS);
      const s1 = parsed.candidates.length > 0 ? parsed.candidates[0].score : 0.95;
      const s2 = parsed.candidates.length > 1 ? parsed.candidates[1].score : 0.0;

      const prior = retailerPriorEngine.getPrior(retailerId, candidateSku.id);

      const { vector, array } = featureExtractor.extract({
        utterance: cleanPhrase,
        candidateSku,
        s1_top_score: s1,
        s2_runner_up_score: s2,
        aliasHit: true,
        unit: parsed.extractedUnit || "CASE",
        quantity: quantity,
        retailerId,
        prior,
      });

      const row: DatasetRow = {
        id: `desk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        templateId: "DESK_CORRECTION",
        split: "train",
        utterance: cleanPhrase,
        retailerId,
        targetSkuId: candidateSku.id,
        predictedSkuId: candidateSku.id,
        label: 1, // Desk clerk verified ground truth
        extractedQty: quantity,
        extractedUnit: unit,
        isAmbiguousUnit: unit === "DABBA" || unit === "UNKNOWN",
        features: array,
        featureMap: vector as unknown as Record<string, number>,
      };

      if (fs.existsSync(TRAIN_JSONL_PATH)) {
        fs.appendFileSync(TRAIN_JSONL_PATH, "\n" + JSON.stringify(row), "utf-8");
      }

      return { aliasSaved: true, trainingRowAppended: true };
    }
  } catch (err) {
    console.warn("Could not append desk correction to train.jsonl:", err);
  }

  return { aliasSaved: true, trainingRowAppended: false };
}
