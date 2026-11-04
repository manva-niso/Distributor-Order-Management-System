import { describe, it, expect } from "vitest";
import {
  CandidateRetriever,
  toPhoneticKey,
  computeTrigramSimilarity,
  phoneticDistance,
} from "@/lib/ai/candidate-retriever";
import { SEED_SKUS } from "@/db/seed-data";

describe("Module 5 - Candidate Retrieval & Reciprocal Rank Fusion (k=60)", () => {

  describe("Phonetic Key Normalization & Transliteration", () => {
    it("normalizes aspirated Hinglish consonants (gh->g, bh->b, ph->f)", () => {
      expect(toPhoneticKey("ghadi")).toBe(toPhoneticKey("gadi"));
      expect(toPhoneticKey("bhaiya")).toBe(toPhoneticKey("baiya"));
      expect(toPhoneticKey("safed")).toBe(toPhoneticKey("saphed"));
    });

    it("collapses duplicate adjacent characters", () => {
      expect(toPhoneticKey("goodday")).toBe(toPhoneticKey("gudday"));
    });

    it("computes high phonetic distance for vernacular spelling variations", () => {
      const score = phoneticDistance("biskut", "biscuit");
      expect(score).toBeGreaterThan(0.7);
    });
  });

  describe("Trigram Character Similarity", () => {
    it("returns 1.0 for identical strings", () => {
      expect(computeTrigramSimilarity("Parle-G", "Parle-G")).toBe(1.0);
    });

    it("returns high similarity for partial or substring names", () => {
      const sim = computeTrigramSimilarity("Good Day Butter", "Good Day Butter Cookies 120 g");
      expect(sim).toBeGreaterThan(0.5);
    });

    it("returns 0.0 for completely disjoint tokens", () => {
      expect(computeTrigramSimilarity("xyz123", "Parle-G")).toBe(0.0);
    });
  });

  describe("Reciprocal Rank Fusion (RRF with k=60)", () => {
    const retriever = new CandidateRetriever(SEED_SKUS, 60);

    it("retrieves Parle-G 75g for phonetic query 'biskut glucose'", () => {
      const results = retriever.retrieve(["biskut", "glucose"]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].sku.code).toBe("SKU-BS-075");
      expect(results[0].score).toBeGreaterThan(0.7);
      expect(results[0].ranks.trigramRank).toBeLessThanOrEqual(5);
    });

    it("retrieves Dettol Soap for phonetic query 'detol sabun'", () => {
      const results = retriever.retrieve(["detol", "sabun"]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].sku.code).toBe("SKU-PC-DT125");
      expect(results[0].ranks.keywordRank).toBeLessThanOrEqual(3);
    });

    it("retrieves Ghadi Detergent Powder for 'gadi detergent powder'", () => {
      const results = retriever.retrieve(["gadi", "detergent", "powder"]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].sku.code).toBe("SKU-DT-1KG");
    });

    it("returns scores strictly normalized between 0.0 and 1.0", () => {
      const results = retriever.retrieve(["wagh", "bakri", "tea"]);
      for (const candidate of results) {
        expect(candidate.score).toBeGreaterThanOrEqual(0.0);
        expect(candidate.score).toBeLessThanOrEqual(1.0);
        expect(candidate.rrfScore).toBeGreaterThan(0.0);
      }
    });

    it("converts ranked candidates to standard SkuCandidate list", () => {
      const ranked = retriever.retrieve(["fortune", "oil"]);
      const standardCandidates = retriever.toSkuCandidates(ranked);

      expect(standardCandidates).toHaveLength(ranked.length);
      expect(standardCandidates[0].sku.code).toBe("SKU-OL-FT1L");
      expect(standardCandidates[0].score).toBe(ranked[0].score);
    });
  });
});
