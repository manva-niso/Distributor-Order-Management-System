import { SeedSku } from "@/db/seed-data";
import { UnitType } from "../types";
import { computeTrigramSimilarity, toPhoneticKey } from "../candidate-retriever";
import { fmcgKnowledgeGraph } from "../knowledge-graph";
import { retailerPriorEngine, RetailerSkuPrior } from "./retailer-prior";

export const FEATURE_NAMES = [
  "s1_top_score",
  "margin_gap",
  "lexical_sim",
  "phonetic_sim",
  "kg_domain_match",
  "alias_hit",
  "has_valid_qty",
  "retailer_sku_freq",
  "retailer_sku_recency",
  "unit_matches_usual",
  "quantity_anomaly",
  "is_ambiguous_unit",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export interface FeatureVector {
  s1_top_score: number;
  margin_gap: number;
  lexical_sim: number;
  phonetic_sim: number;
  kg_domain_match: number;
  alias_hit: number;
  has_valid_qty: number;
  retailer_sku_freq: number;
  retailer_sku_recency: number;
  unit_matches_usual: number;
  quantity_anomaly: number;
  is_ambiguous_unit: number;
}

export interface FeatureExtractionInput {
  utterance: string;
  candidateSku: SeedSku;
  s1_top_score: number;
  s2_runner_up_score: number;
  aliasHit: boolean;
  unit: UnitType;
  quantity: number | null;
  retailerId?: string;
  prior?: RetailerSkuPrior;
}

export class FeatureExtractor {
  /**
   * Computes the single-source-of-truth 12-dimensional feature vector for a candidate SKU match.
   */
  public extract(input: FeatureExtractionInput): { vector: FeatureVector; array: number[] } {
    const {
      utterance,
      candidateSku,
      s1_top_score,
      s2_runner_up_score,
      aliasHit,
      unit,
      quantity,
      retailerId,
    } = input;

    // 1. Margin Gap (S1 - S2)
    const margin_gap = Math.max(0, s1_top_score - (s2_runner_up_score || 0));

    // 2. Lexical & Trigram Similarity against candidate SKU name and brand
    const trigramName = computeTrigramSimilarity(utterance, candidateSku.name);
    const trigramBrand = candidateSku.brand
      ? computeTrigramSimilarity(utterance, candidateSku.brand)
      : 0;
    const lexical_sim = Math.max(trigramName, trigramBrand);

    // 3. Phonetic Similarity
    const pKeyUtterance = toPhoneticKey(utterance);
    const pKeySku = toPhoneticKey(candidateSku.name);
    const pKeyBrand = candidateSku.brand ? toPhoneticKey(candidateSku.brand) : "";
    const phonetic_sim =
      pKeyUtterance.includes(pKeySku) || pKeySku.includes(pKeyUtterance) ||
      (pKeyBrand.length > 2 && (pKeyUtterance.includes(pKeyBrand) || pKeyBrand.includes(pKeyUtterance)))
        ? 1.0
        : computeTrigramSimilarity(pKeyUtterance, pKeySku);

    // 4. Knowledge Graph Domain Match
    const kgNode = fmcgKnowledgeGraph.identifyDomain(utterance);
    let kg_domain_match = 0.5; // neutral when no specific domain detected
    if (kgNode && kgNode.category !== "UNKNOWN_DOMAIN") {
      const catLower = (candidateSku.category || "").toLowerCase();
      const isMatch = kgNode.catalogCategories.some((cc) => catLower.includes(cc.toLowerCase()));
      kg_domain_match = isMatch ? 1.0 : 0.0;
    }

    // 5. Quantity Validity
    const has_valid_qty = quantity !== null && quantity > 0 ? 1.0 : 0.0;

    // 6. Retailer Prior Features
    const prior = input.prior || (retailerId ? retailerPriorEngine.getPrior(retailerId, candidateSku.id) : null);
    const retailer_sku_freq = prior ? prior.frequency : 0.0;

    // Recency decay: exp(-0.05 * days) -> 1.0 if today, 0.5 if ~14 days ago, 0.0 if never
    const recencyDays = prior ? prior.recencyDays : 999;
    const retailer_sku_recency = prior && prior.orderCount > 0 ? Math.exp(-0.05 * recencyDays) : 0.0;

    // Unit match with habit
    const unit_matches_usual =
      prior && prior.isEstablished
        ? (unit === "CASE" && prior.usualUnit === "CASE") || (unit === "PACK" && prior.usualUnit === "PACK")
          ? 1.0
          : 0.0
        : 0.5;

    // Quantity Anomaly Outlier
    let quantity_anomaly = 0.0;
    if (retailerId && quantity && quantity > 0) {
      const anomaly = retailerPriorEngine.detectQuantityAnomaly(retailerId, candidateSku, quantity);
      if (anomaly.isAnomaly) {
        quantity_anomaly = 1.0;
      }
    }

    // Ambiguous Unit Invariant (Strict: DABBA or UNKNOWN)
    const is_ambiguous_unit = unit === "DABBA" || unit === "UNKNOWN" ? 1.0 : 0.0;

    const vector: FeatureVector = {
      s1_top_score: Math.round(s1_top_score * 1000) / 1000,
      margin_gap: Math.round(margin_gap * 1000) / 1000,
      lexical_sim: Math.round(lexical_sim * 1000) / 1000,
      phonetic_sim: Math.round(phonetic_sim * 1000) / 1000,
      kg_domain_match: Math.round(kg_domain_match * 1000) / 1000,
      alias_hit: aliasHit ? 1.0 : 0.0,
      has_valid_qty,
      retailer_sku_freq: Math.round(retailer_sku_freq * 1000) / 1000,
      retailer_sku_recency: Math.round(retailer_sku_recency * 1000) / 1000,
      unit_matches_usual,
      quantity_anomaly,
      is_ambiguous_unit,
    };

    const array = FEATURE_NAMES.map((name) => vector[name]);

    return { vector, array };
  }
}

export const featureExtractor = new FeatureExtractor();
