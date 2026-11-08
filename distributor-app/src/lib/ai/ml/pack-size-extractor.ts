/**
 * FMCG Pack-Size & Colloquial Size-Modifier Extractor
 *
 * Disambiguates look-alike size families (Parle 75g vs 250g, Ghadi 500g vs 1kg,
 * Fortune 1L vs 15L, Dettol 75g vs 125g, Maggi 70g vs 140g) by extracting
 * explicit numeric measurements (g, kg, L, ml) and vernacular Indic modifiers
 * (chhota, bada, double pack, family pack, aadha kilo, tin).
 */

export interface ExtractedPackSize {
  hasSizeMention: boolean;
  numericValue: number | null; // Normalized (grams for solids, ml for liquids)
  unitType: "mass" | "volume" | null;
  colloquialTier: "SMALL" | "LARGE" | "TIN" | null;
  rawMatchedToken?: string;
}

export interface PackSizeMatchResult {
  score: number; // +1.0 = exact, +0.8 = colloquial tier match, -1.0 = explicit mismatch, 0 = neutral
  matchType: "EXACT_NUMERIC" | "COLLOQUIAL_TIER" | "EXPLICIT_MISMATCH" | "NEUTRAL";
  reason: string;
}

export class PackSizeExtractor {
  /**
   * Normalizes standard pack size strings from the catalog (e.g. "75 g", "1 kg", "15 L", "100 ml")
   * to a numeric value in grams or ml.
   */
  public parseSkuPackSize(packSizeStr: string): { value: number; unitType: "mass" | "volume" } | null {
    if (!packSizeStr) return null;
    const clean = packSizeStr.toLowerCase().trim();

    // Kilograms -> Grams
    const kgMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|किग्रा|किलो)/i);
    if (kgMatch) return { value: parseFloat(kgMatch[1]) * 1000, unitType: "mass" };

    // Grams
    const gMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams|ग्राम)/i);
    if (gMatch) return { value: parseFloat(gMatch[1]), unitType: "mass" };

    // Litres -> Millilitres
    const lMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|ltr|liter|litre|litres|लीटर)/i);
    if (lMatch) return { value: parseFloat(lMatch[1]) * 1000, unitType: "volume" };

    // Millilitres
    const mlMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:ml|milli|मिली)/i);
    if (mlMatch) return { value: parseFloat(mlMatch[1]), unitType: "volume" };

    return null;
  }

  /**
   * Extracts explicit metric measurements or Hindi colloquial size tokens from an utterance.
   */
  public extract(utterance: string): ExtractedPackSize {
    const text = utterance.toLowerCase();

    // 1. Check regional vernacular fractional weights first
    if (/\b(?:aadha|adha)\s*(?:kilo|kg|किलो)\b/i.test(text) || /\b500\s*(?:g|gm|gram|ग्राम)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: 500, unitType: "mass", colloquialTier: "SMALL", rawMatchedToken: "aadha kilo" };
    }
    if (/\b(?:ek|1)\s*(?:kilo|kg|किलो)\b/i.test(text) || /\b1000\s*(?:g|gm|gram|ग्राम)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: 1000, unitType: "mass", colloquialTier: "LARGE", rawMatchedToken: "1kg" };
    }
    if (/\b(?:pao|pav)\s*(?:kilo|किलो)?\b/i.test(text) || /\b250\s*(?:g|gm|gram|ग्राम)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: 250, unitType: "mass", colloquialTier: "SMALL", rawMatchedToken: "pao" };
    }
    if (/\b(?:derh|dedh)\s*(?:kilo|kg|किलो)\b/i.test(text) || /\b1500\s*(?:g|gm|gram|ग्राम)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: 1500, unitType: "mass", colloquialTier: "LARGE", rawMatchedToken: "derh kilo" };
    }

    // 2. Check 15 Litre Tin vs 1 Litre Pouch
    if (/\b15\s*(?:l|lt|ltr|liter|litre|litres|लीटर|tin|टिन|dabba|डिब्बा)\b/i.test(text) || /\b(?:bada\s*tel|tel\s*tin)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: 15000, unitType: "volume", colloquialTier: "TIN", rawMatchedToken: "15L tin" };
    }
    if (/\b1\s*(?:l|lt|ltr|liter|litre|litres|लीटर|pouch|पाउच)\b/i.test(text) || /\b(?:refine\s*tel\s*1l|fortune\s*1l)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: 1000, unitType: "volume", colloquialTier: "SMALL", rawMatchedToken: "1L pouch" };
    }

    // 3. Check explicit numeric measurements with regex
    // Kilograms (e.g. 5kg, 1kg)
    const kg = text.match(/\b(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|किलो|किग्रा)\b/i);
    if (kg) {
      const val = parseFloat(kg[1]) * 1000;
      return { hasSizeMention: true, numericValue: val, unitType: "mass", colloquialTier: val <= 500 ? "SMALL" : "LARGE", rawMatchedToken: kg[0] };
    }

    // Grams (e.g. 75g, 250g, 100g, 140g, 120g)
    const gm = text.match(/\b(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams|ग्राम)\b/i);
    if (gm) {
      const val = parseFloat(gm[1]);
      return { hasSizeMention: true, numericValue: val, unitType: "mass", colloquialTier: val <= 100 ? "SMALL" : "LARGE", rawMatchedToken: gm[0] };
    }

    // Litres
    const ltr = text.match(/\b(\d+(?:\.\d+)?)\s*(?:l|lt|ltr|liter|litre|litres|लीटर)\b/i);
    if (ltr) {
      const val = parseFloat(ltr[1]) * 1000;
      return { hasSizeMention: true, numericValue: val, unitType: "volume", colloquialTier: val > 5000 ? "TIN" : "SMALL", rawMatchedToken: ltr[0] };
    }

    // Millilitres
    const ml = text.match(/\b(\d+(?:\.\d+)?)\s*(?:ml|milli|मिली)\b/i);
    if (ml) {
      const val = parseFloat(ml[1]);
      return { hasSizeMention: true, numericValue: val, unitType: "volume", colloquialTier: "SMALL", rawMatchedToken: ml[0] };
    }

    // 4. Colloquial Size Modifiers (chhota, bada, double, family pack)
    if (/\b(?:chhota|chhoti|choti|small|छोटा|छोटी|single|singal)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: null, unitType: null, colloquialTier: "SMALL", rawMatchedToken: "chhota" };
    }

    if (/\b(?:bada|badi|large|big|बड़ा|बड़ी|family\s*pack|double|double\s*pack|do\s*packet)\b/i.test(text)) {
      return { hasSizeMention: true, numericValue: null, unitType: null, colloquialTier: "LARGE", rawMatchedToken: "bada" };
    }

    return { hasSizeMention: false, numericValue: null, unitType: null, colloquialTier: null };
  }

  /**
   * Compares the extracted pack size from the utterance against the candidate SKU pack size.
   */
  public evaluateMatch(utterance: string, candidatePackSize: string, candidateSkuId: string): PackSizeMatchResult {
    const extracted = this.extract(utterance);
    if (!extracted.hasSizeMention) {
      return { score: 0.0, matchType: "NEUTRAL", reason: "No size token specified in utterance" };
    }

    const skuSize = this.parseSkuPackSize(candidatePackSize);
    if (!skuSize) {
      return { score: 0.0, matchType: "NEUTRAL", reason: "SKU has unparsed pack size" };
    }

    // 1. Direct Numeric Check
    if (extracted.numericValue !== null && extracted.unitType === skuSize.unitType) {
      if (Math.abs(extracted.numericValue - skuSize.value) < 1e-2) {
        return {
          score: 1.0,
          matchType: "EXACT_NUMERIC",
          reason: `Exact pack size match (${extracted.rawMatchedToken} matches ${candidatePackSize})`,
        };
      } else {
        // Explicit measurement mismatch (e.g. user said 15L, but candidate is 1L; or user said 75g, but candidate is 250g)
        return {
          score: -1.0,
          matchType: "EXPLICIT_MISMATCH",
          reason: `Explicit size mismatch (${extracted.rawMatchedToken} differs from SKU ${candidatePackSize})`,
        };
      }
    }

    // 2. Colloquial Tier Check (chhota vs bada)
    if (extracted.colloquialTier !== null) {
      // Known small variants: Parle 75g, Ghadi 500g, Dettol 75g, Maggi 70g, Fortune 1L
      // Known large variants: Parle 250g, Ghadi 1kg, Dettol 125g, Maggi 140g, Fortune 15L
      const isKnownSmallSku =
        candidateSkuId === "SKU-BS-PG075" ||
        candidateSkuId === "SKU-DT-GH500" ||
        candidateSkuId === "SKU-PC-DT075" ||
        candidateSkuId === "SKU-FD-MG070" ||
        candidateSkuId === "SKU-OL-FT1L";

      const isKnownLargeSku =
        candidateSkuId === "SKU-BS-PG250" ||
        candidateSkuId === "SKU-DT-GH1KG" ||
        candidateSkuId === "SKU-PC-DT125" ||
        candidateSkuId === "SKU-FD-MG140" ||
        candidateSkuId === "SKU-OL-FT15T";

      if (extracted.colloquialTier === "SMALL" && isKnownSmallSku) {
        return { score: 0.85, matchType: "COLLOQUIAL_TIER", reason: `Colloquial 'chhota' matches small SKU variant (${candidatePackSize})` };
      }
      if (extracted.colloquialTier === "LARGE" && isKnownLargeSku) {
        return { score: 0.85, matchType: "COLLOQUIAL_TIER", reason: `Colloquial 'bada' matches large SKU variant (${candidatePackSize})` };
      }
      if (extracted.colloquialTier === "TIN" && candidateSkuId === "SKU-OL-FT15T") {
        return { score: 1.0, matchType: "EXACT_NUMERIC", reason: `Colloquial 'tin' matches 15L Tin SKU` };
      }

      // Inverted mismatch: user asked for "chhota", but candidate is the large variant!
      if (extracted.colloquialTier === "SMALL" && isKnownLargeSku) {
        return { score: -0.9, matchType: "EXPLICIT_MISMATCH", reason: `User specified 'chhota', but candidate is large variant (${candidatePackSize})` };
      }
      if ((extracted.colloquialTier === "LARGE" || extracted.colloquialTier === "TIN") && isKnownSmallSku) {
        return { score: -0.9, matchType: "EXPLICIT_MISMATCH", reason: `User specified 'bada/tin', but candidate is small variant (${candidatePackSize})` };
      }
    }

    return { score: 0.0, matchType: "NEUTRAL", reason: "Size mention neutral for this SKU" };
  }
}

export const packSizeExtractor = new PackSizeExtractor();
