import { SeedSku, SEED_SKUS } from "@/db/seed-data";
import { SkuCandidate } from "./types";
import { fmcgKnowledgeGraph } from "./knowledge-graph";
import { packSizeExtractor } from "./ml/pack-size-extractor";

export interface RetrievalRankDetail {
  trigramRank: number;
  keywordRank: number;
  phoneticRank: number;
}

export interface RankedCandidate {
  sku: SeedSku;
  score: number; // Normalized RRF score (0.0 to 1.0)
  rrfScore: number; // Raw Cormack RRF score
  ranks: RetrievalRankDetail;
}

// Category synonyms mapping colloquial Indic terms to catalog categories & attributes
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  sabun: ["soap", "bathing", "personal care", "cake", "bar"],
  saboon: ["soap", "bathing", "personal care", "cake", "bar"],
  soap: ["soap", "personal care"],
  biscuit: ["biscuits", "cookies"],
  biskut: ["biscuits", "cookies"],
  chai: ["tea"],
  chay: ["tea"],
  tea: ["tea"],
  patti: ["tea"],
  tel: ["cooking oil", "oil"],
  oil: ["cooking oil", "oil"],
  powder: ["powder", "detergent"],
  surf: ["detergent", "powder"],
  namak: ["salt", "iodised salt", "packaged foods"],
  salt: ["salt", "iodised salt", "packaged foods"],
  "kachi ghani": ["mustard", "mustard oil", "kachi ghani"],
  ghani: ["mustard", "mustard oil", "kachi ghani"],
  sarson: ["mustard", "mustard oil", "kachi ghani"],
  sarso: ["mustard", "mustard oil", "kachi ghani"],
  mustard: ["mustard", "mustard oil", "kachi ghani"],
  bartan: ["dishwash", "dishwash bar", "lemon bar"],
  dishwash: ["dishwash", "dishwash bar", "lemon bar"],
};

/**
 * Phonetic canonical key generator for Indian Hinglish / Hindi FMCG trade
 * Normalizes vowel length and aspirated consonants (ph->f, gh->g, kh->k, ee->i, etc.)
 */
export function toPhoneticKey(input: string): string {
  let s = input.toLowerCase().trim();
  s = s.replace(/[^a-z0-9]/g, "");

  // Common Hinglish / Indic phonetic collapses
  s = s.replace(/ph/g, "f");
  s = s.replace(/kh/g, "k");
  s = s.replace(/gh/g, "g");
  s = s.replace(/bh/g, "b");
  s = s.replace(/dh/g, "d");
  s = s.replace(/th/g, "t");
  s = s.replace(/chh/g, "ch");
  s = s.replace(/sh/g, "s");
  s = s.replace(/ee+/g, "i");
  s = s.replace(/oo+/g, "u");
  s = s.replace(/aa+/g, "a");
  s = s.replace(/v/g, "w");
  s = s.replace(/z/g, "j");
  s = s.replace(/(.)\1+/g, "$1"); // Deduplicate adjacent characters (e.g. biskut vs biscut)

  return s;
}

/**
 * Computes character 3-gram Dice similarity coefficient
 */
export function computeTrigramSimilarity(a: string, b: string): number {
  const sA = a.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, "");
  const sB = b.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, "");

  if (sA === sB) return 1.0;
  if (sA.length < 3 || sB.length < 3) {
    return sA.includes(sB) || sB.includes(sA) ? 0.6 : 0.0;
  }

  const getTrigrams = (str: string) => {
    const set = new Set<string>();
    for (let i = 0; i <= str.length - 3; i++) {
      set.add(str.substring(i, i + 3));
    }
    return set;
  };

  const triA = getTrigrams(sA);
  const triB = getTrigrams(sB);
  let intersection = 0;
  for (const tri of triA) {
    if (triB.has(tri)) intersection++;
  }

  return (2 * intersection) / (triA.size + triB.size);
}

/**
 * Levenshtein distance on phonetic keys
 */
export function phoneticDistance(a: string, b: string): number {
  const pA = toPhoneticKey(a);
  const pB = toPhoneticKey(b);
  if (pA === pB) return 1.0;
  if (!pA.length || !pB.length) return 0.0;

  const m = pA.length;
  const n = pB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (pA[i - 1] === pB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const editDist = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.max(0, 1 - editDist / maxLen);
}

/**
 * Reciprocal Rank Fusion (RRF) Candidate Retriever
 * Combines Lexical Trigrams, Attribute Keyword Matching, and Phonetic Transliteration
 * using Cormack et al. (SIGIR 2009) RRF algorithm with standard k=60.
 */
export class CandidateRetriever {
  private k: number;
  private catalog: SeedSku[];
  private enablePackSizeExtractor: boolean;

  constructor(catalog: SeedSku[] = SEED_SKUS, k: number = 60, enablePackSizeExtractor: boolean = true) {
    this.catalog = catalog;
    this.k = k;
    this.enablePackSizeExtractor = enablePackSizeExtractor;
  }

  /**
   * Ranker A: Lexical Trigram Matching (with Hindi/Hinglish category synonym support)
   */
  private rankByTrigram(queryText: string): { sku: SeedSku; rawScore: number }[] {
    const cleanTokens = queryText.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
    const synonyms = cleanTokens.flatMap((t) => CATEGORY_SYNONYMS[t] || []);

    const scores = this.catalog.map((sku) => {
      const nameScore = computeTrigramSimilarity(queryText, sku.name);
      const brandScore = computeTrigramSimilarity(queryText, sku.brand);
      const catScore = computeTrigramSimilarity(queryText, sku.category);
      let synScore = 0;
      for (const syn of synonyms) {
        const sName = computeTrigramSimilarity(syn, sku.name);
        const sCat = computeTrigramSimilarity(syn, sku.category);
        synScore = Math.max(synScore, sName, sCat * 0.9);
      }
      const rawScore = Math.max(nameScore, brandScore * 0.9, catScore * 0.8, synScore * 0.85);
      return { sku, rawScore };
    });

    return scores.sort((a, b) => b.rawScore - a.rawScore);
  }

  /**
   * Ranker B: Keyword, Attribute & Phonetic Token Overlap Matching
   */
  private rankByKeyword(cleanTokens: string[]): { sku: SeedSku; rawScore: number }[] {
    const scores = this.catalog.map((sku) => {
      let rawScore = 0;
      const bLower = sku.brand.toLowerCase();
      const cLower = sku.category.toLowerCase();
      const nLower = sku.name.toLowerCase();
      const pLower = sku.packSize.toLowerCase();
      const nameWords = nLower.split(/[\s,]+/);

      for (const t of cleanTokens) {
        // Direct brand or phonetic brand match
        if (bLower === t || bLower.includes(t)) {
          rawScore += 0.45;
        } else if (phoneticDistance(t, bLower) > 0.8) {
          rawScore += 0.40;
        }

        // Name word match or phonetic name word match (e.g. "detol" matches "dettol")
        let matchedNameWord = false;
        for (const nw of nameWords) {
          if (nw === t || nw.includes(t)) {
            rawScore += 0.40;
            matchedNameWord = true;
            break;
          } else if (t.length >= 4 && phoneticDistance(t, nw) > 0.8) {
            rawScore += 0.35;
            matchedNameWord = true;
            break;
          }
        }

        // Category match
        if (cLower.includes(t)) rawScore += 0.30;
        if (pLower.includes(t)) rawScore += 0.25;

        // Category synonyms (e.g. sabun -> personal care / soap / cake)
        if (CATEGORY_SYNONYMS[t] && !matchedNameWord) {
          for (const syn of CATEGORY_SYNONYMS[t]) {
            if (cLower.includes(syn) || nLower.includes(syn)) {
              rawScore += 0.35;
              break;
            }
          }
        }
      }

      return { sku, rawScore };
    });

    return scores.sort((a, b) => b.rawScore - a.rawScore);
  }

  /**
   * Ranker C: Token-Level Phonetic Transliteration Matching
   */
  private rankByPhonetic(cleanTokens: string[]): { sku: SeedSku; rawScore: number }[] {
    const scores = this.catalog.map((sku) => {
      const skuWords = [
        ...sku.brand.toLowerCase().split(/\s+/),
        ...sku.name.toLowerCase().split(/[\s,]+/),
      ].filter((w) => w.length > 2);

      let bestMatch = 0;

      for (const qToken of cleanTokens) {
        // Only attempt phonetic match if token has substantial length (>= 4 chars)
        if (qToken.length >= 4) {
          for (const sWord of skuWords) {
            const dist = phoneticDistance(qToken, sWord);
            if (dist > bestMatch) bestMatch = dist;
          }
        }
      }

      return { sku, rawScore: bestMatch };
    });

    return scores.sort((a, b) => b.rawScore - a.rawScore);
  }

  /**
   * Main Retrieval Method using Reciprocal Rank Fusion
   * Formula: RRF(d) = sum_{m in M} 1 / (k + r_m(d))
   */
  public retrieve(queryTokens: string[], topK: number = 3): RankedCandidate[] {
    const cleanTokens = queryTokens
      .map((t) => t.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, ""))
      .filter((t) => t.length > 0);

    const queryText = cleanTokens.join(" ");

    // Run all 3 rankers independently
    const trigramRanked = this.rankByTrigram(queryText);
    const keywordRanked = this.rankByKeyword(cleanTokens);
    const phoneticRanked = this.rankByPhonetic(cleanTokens);

    // Build rank maps (1-indexed for items that actually met minimum relevance threshold)
    const trigramMap = new Map<string, number>();
    trigramRanked
      .filter((item) => item.rawScore >= 0.20)
      .forEach((item, idx) => trigramMap.set(item.sku.code, idx + 1));

    const keywordMap = new Map<string, number>();
    keywordRanked
      .filter((item) => item.rawScore >= 0.30)
      .forEach((item, idx) => keywordMap.set(item.sku.code, idx + 1));

    const phoneticMap = new Map<string, number>();
    phoneticRanked
      .filter((item) => item.rawScore >= 0.75)
      .forEach((item, idx) => phoneticMap.set(item.sku.code, idx + 1));

    const numActiveRankers =
      (trigramMap.size > 0 ? 1 : 0) +
      (keywordMap.size > 0 ? 1 : 0) +
      (phoneticMap.size > 0 ? 1 : 0);

    // If no ranker found any match, query the FMCG Trade Knowledge Graph for category intent
    if (numActiveRankers === 0) {
      const suggestions = fmcgKnowledgeGraph.getSmartSuggestions({
        rawUtterance: queryText,
        catalog: this.catalog,
        topK,
      });

      if (suggestions.candidates.length > 0) {
        return suggestions.candidates.map((c, idx) => ({
          sku: c.sku,
          score: c.score,
          rrfScore: Math.round(c.score * 1000) / 1000,
          ranks: { trigramRank: idx + 1, keywordRank: idx + 1, phoneticRank: idx + 1 },
        }));
      }

      return [];
    }

    // Effective ranker count prevents a single weak ranker from claiming 100% confidence
    const effectiveRankers = Math.max(2, numActiveRankers);
    const maxRrf = effectiveRankers / (this.k + 1);

    const candidates: RankedCandidate[] = this.catalog.map((sku) => {
      const rTrigram = trigramMap.get(sku.code);
      const rKeyword = keywordMap.get(sku.code);
      const rPhonetic = phoneticMap.get(sku.code);

      // If an item did not match a ranker, its reciprocal score contribution is 0
      const scoreTrigram = rTrigram !== undefined ? 1.0 / (this.k + rTrigram) : 0;
      const scoreKeyword = rKeyword !== undefined ? 1.0 / (this.k + rKeyword) : 0;
      const scorePhonetic = rPhonetic !== undefined ? 1.0 / (this.k + rPhonetic) : 0;

      let rrfScore = scoreTrigram + scoreKeyword + scorePhonetic;

      // Pack-size & Colloquial modifier disambiguation
      if (this.enablePackSizeExtractor && rrfScore > 0) {
        const sizeMatch = packSizeExtractor.evaluateMatch(queryText, sku.packSize, sku.id);
        if (sizeMatch.score > 0) {
          rrfScore *= (1.0 + sizeMatch.score * 0.45);
        } else if (sizeMatch.score < 0) {
          rrfScore *= Math.max(0.15, 1.0 + sizeMatch.score * 0.75);
        }
      }

      const normalizedScore = Math.min(1.0, Math.round((rrfScore / maxRrf) * 100) / 100);

      return {
        sku,
        score: normalizedScore,
        rrfScore: Math.round(rrfScore * 10000) / 10000,
        ranks: {
          trigramRank: rTrigram || 999,
          keywordRank: rKeyword || 999,
          phoneticRank: rPhonetic || 999,
        },
      };
    });

    // Sort descending by raw rrfScore first (prevents rounding ties), then by score
    candidates.sort((a, b) => b.rrfScore - a.rrfScore || b.score - a.score);

    return candidates.slice(0, topK);
  }

  /**
   * Helper to convert RankedCandidate list into standard SkuCandidate list for pipelines
   */
  public toSkuCandidates(ranked: RankedCandidate[]): SkuCandidate[] {
    return ranked.map((r) => ({
      sku: r.sku,
      score: r.score,
    }));
  }
}

// Global default retriever instance
export const defaultCandidateRetriever = new CandidateRetriever(SEED_SKUS, 60);
