import { SEED_SKUS, SeedSku } from "../data/catalog";
import {
  ParsedLineItem,
  ParseResult,
  UnitType,
  AmbiguityReason,
  SkuCandidate,
  OrderParserPipeline,
  ParserContext,
} from "./types";

// Hindi Devanagari digit translation map
const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

// Word numeral translations (Latin Hinglish, English, and Devanagari Hindi)
const WORD_NUMBERS: Record<string, number> = {
  // English
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  twentyfive: 25,
  // Hinglish
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  panch: 5,
  paanch: 5,
  chheh: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  pandrah: 15,
  bees: 20,
  pachees: 25,
  aadha: 0.5,
  adha: 0.5,
  // Devanagari
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  ग्यारह: 11,
  बारह: 12,
  पंद्रह: 15,
  बीस: 20,
  पच्चीस: 25,
  आधा: 0.5,
};

// Wholesale Master Case Keywords
const CASE_KEYWORDS = [
  "peti",
  "petee",
  "petti",
  "petiyan",
  "case",
  "cases",
  "box",
  "boxes",
  "carton",
  "cartons",
  "dabba",
  "dabbe",
  "crate",
  "पेटी",
  "पेटियां",
  "पेटिया",
  "डिब्बा",
  "डिब्बे",
  "बॉक्स",
  "कार्टन",
];

// Retail Loose Pack Keywords
const PACK_KEYWORDS = [
  "packet",
  "packets",
  "pack",
  "packs",
  "pkt",
  "pkts",
  "piece",
  "pieces",
  "pc",
  "pcs",
  "pouch",
  "pouches",
  "पैकेट",
  "पैक",
  "पीस",
  "पाउच",
];

// Conversational filler words to strip out
const NOISE_WORDS = [
  "bhaiya",
  "bhai",
  "ji",
  "chahiye",
  "bhejo",
  "bhej",
  "dena",
  "dedo",
  "de",
  "do",
  "likho",
  "order",
  "jaldi",
  "please",
  "urgent",
  "aur",
  "and",
  "kal",
  "subah",
  "parchi",
  "namaste",
  "ram",
  "wala",
  "wali",
  "wale",
  "ka",
  "ki",
  "ke",
  "ko",
  "se",
  "me",
  "mai",
  "mein",
  "of",
  "in",
  "from",
  "for",
  "to",
  "at",
  "with",
  "भैया",
  "भाई",
  "जी",
  "चाहिए",
  "भेज",
  "दो",
  "देना",
  "देदो",
  "भेजो",
  "लिखो",
  "नमस्ते",
  "राम",
  "और",
  "तथा",
  "वाला",
  "वाली",
  "वाले",
  "का",
  "की",
  "के",
  "को",
  "से",
  "में",
  "मे",
];

/**
 * Normalizes input text converting Devanagari numerals to standard digits
 */
export function normalizeNumerals(text: string): string {
  let normalized = text;
  for (const [dev, arab] of Object.entries(DEVANAGARI_DIGITS)) {
    normalized = normalized.replaceAll(dev, arab);
  }
  return normalized;
}

/**
 * Fuses numeric weights with their units so they are treated as product attributes
 * (e.g., "1 kg" -> "1kg", "75 g" -> "75g", "250 gm" -> "250g")
 */
export function normalizeWeights(text: string): string {
  return text
    .replace(/(\d+)\s*(kg|kilo|किलो)\b/gi, "$1kg")
    .replace(/(\d+)\s*(g|gm|gram|ग्राम)\b/gi, "$1g")
    .replace(/(\d+)\s*(ml|मिली)\b/gi, "$1ml")
    .replace(/(\d+)\s*(ltr|liter|litre|लीटर)\b/gi, "$1ltr");
}

interface PartialCaseIntent {
  requestedPacks: number;
  caseCapacityMentioned: number | null;
  cleanedUtterance: string;
}

/**
 * Detects requests for loose packs from within a case (e.g. "case of 20 mai se 15 dedo", "15 out of 20")
 */
function detectPartialCaseIntent(text: string): PartialCaseIntent | null {
  // Pattern 1: Hinglish/Hindi "... (case of 20)? mai se 15 (dedo|chahiye)?"
  const hindiMatch = text.match(
    /(?:case|peti|box|कार्टन|पेटी)?\s*(?:of|ki|ka)?\s*(\d+)?\s*(?:mai\s*se|me\s*se|mein\s*se|में\s*से|मे\s*से)\s*(\d+|[a-zA-Z\u0900-\u097F]+)/i
  );
  if (hindiMatch) {
    const rawCap = hindiMatch[1] ? parseInt(hindiMatch[1]) : null;
    const rawQty = hindiMatch[2];
    let qty: number | null = null;
    if (/^\d+$/.test(rawQty)) {
      qty = parseInt(rawQty);
    } else if (WORD_NUMBERS[rawQty.toLowerCase()] !== undefined) {
      qty = WORD_NUMBERS[rawQty.toLowerCase()];
    }

    if (qty !== null && qty > 0) {
      const cleaned = text.replace(hindiMatch[0], " ").trim();
      return {
        requestedPacks: qty,
        caseCapacityMentioned: rawCap,
        cleanedUtterance: cleaned,
      };
    }
  }

  // Pattern 2: English "15 out of 20" or "15 from case of 20"
  const englishMatch = text.match(/(\d+|[a-zA-Z]+)\s*(?:out\s*of|from)\s*(?:case\s*of\s*)?(\d+)/i);
  if (englishMatch) {
    const rawQty = englishMatch[1];
    const rawCap = parseInt(englishMatch[2]);
    let qty: number | null = null;
    if (/^\d+$/.test(rawQty)) {
      qty = parseInt(rawQty);
    } else if (WORD_NUMBERS[rawQty.toLowerCase()] !== undefined) {
      qty = WORD_NUMBERS[rawQty.toLowerCase()];
    }

    if (qty !== null && qty > 0) {
      const cleaned = text.replace(englishMatch[0], " ").trim();
      return {
        requestedPacks: qty,
        caseCapacityMentioned: rawCap,
        cleanedUtterance: cleaned,
      };
    }
  }

  return null;
}

/**
 * Strips descriptive/explanatory case clauses such as "where a case contains 24 pkts",
 * "jiski peti me 24 packet aate hai", "a case contains 24", "case of 24 pkts"
 * while recording the user-specified case capacity for context.
 */
function extractAndStripExplanatoryClause(text: string): { cleanedText: string; explanatoryCapacity: number | null } {
  const clauseRegex = /(?:,\s*)?(?:where|with|jiski|jisme)?\s*(?:a\s*)?(?:case|peti|box|carton|पेटी|डिब्बा)?\s*(?:contains|has|me|mein|aate\s*hai|hote\s*hai|wali)\s*(\d+)\s*(?:pkts|packets|packs|pieces|pcs|पैकेट|पीस)?/i;
  const match = text.match(clauseRegex);
  if (match) {
    const capacity = match[1] ? parseInt(match[1], 10) : null;
    const cleaned = text.replace(match[0], " ").trim();
    return { cleanedText: cleaned, explanatoryCapacity: capacity };
  }
  return { cleanedText: text, explanatoryCapacity: null };
}

/**
 * Splits raw multi-item order text into individual item lines
 */
export function splitOrderTextIntoLines(rawText: string): string[] {
  // First normalize numbers
  const cleaned = normalizeNumerals(rawText.trim());

  // Split on newlines, semicolons, or comma/plus delimiters
  const rawSegments = cleaned
    .split(/\r?\n|;|\band\b|\baur\b|\bतथा\b|\+/i)
    .flatMap((seg) => seg.split(/,(?=\s*\d|\s*[a-zA-Z\u0900-\u097F]+)/)) // Split commas followed by new item tokens
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return rawSegments;
}

/**
 * Extracts numeric quantity from an utterance
 */
function extractQuantity(tokens: string[]): { qty: number | null; remainingTokens: string[] } {
  const remaining: string[] = [];
  let detectedQty: number | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();

    // Check direct numeric digit (e.g. 5, 10, 0.5)
    if (/^\d+(\.\d+)?$/.test(token) && detectedQty === null) {
      detectedQty = parseFloat(token);
      continue;
    }

    // Check word numeral (e.g. "paanch", "do", "five", "दो")
    if (WORD_NUMBERS[token] !== undefined && detectedQty === null) {
      detectedQty = WORD_NUMBERS[token];
      continue;
    }

    remaining.push(tokens[i]);
  }

  return { qty: detectedQty, remainingTokens: remaining };
}

/**
 * Detects unit of measure (CASE vs PACK vs KG vs UNKNOWN)
 */
function extractUnit(tokens: string[]): { unit: UnitType; remainingTokens: string[] } {
  const remaining: string[] = [];
  let detectedUnit: UnitType = "UNKNOWN";

  for (const token of tokens) {
    const clean = token.toLowerCase();

    if (CASE_KEYWORDS.includes(clean) && detectedUnit === "UNKNOWN") {
      detectedUnit = "CASE";
      continue;
    }

    if (PACK_KEYWORDS.includes(clean) && detectedUnit === "UNKNOWN") {
      detectedUnit = "PACK";
      continue;
    }

    if ((clean === "kg" || clean === "kilo" || clean === "किलो") && detectedUnit === "UNKNOWN") {
      detectedUnit = "KG";
      continue;
    }

    remaining.push(token);
  }

  return { unit: detectedUnit, remainingTokens: remaining };
}

/**
 * Computes similarity match score between cleaned keywords and SKU catalog
 */
function matchSku(queryTokens: string[], skus: SeedSku[]): { matched: SeedSku | null; candidates: SkuCandidate[] } {
  // Filter out conversational filler words
  const cleanTokens = queryTokens
    .map((t) => t.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, ""))
    .filter((t) => t.length > 1 && !NOISE_WORDS.includes(t));

  const candidates: SkuCandidate[] = [];

  for (const sku of skus) {
    let score = 0;
    const skuName = sku.name.toLowerCase();
    const skuBrand = sku.brand.toLowerCase();
    const skuCategory = sku.category.toLowerCase();
    const skuPackSize = sku.packSize.toLowerCase();

    // Brand matching (highest priority weight: +0.4)
    for (const token of cleanTokens) {
      if (skuBrand.includes(token) || token.includes(skuBrand)) {
        score += 0.4;
        break;
      }
      if (token === "parleg" || token === "parle-g") {
        if (sku.code.includes("BS-075")) score += 0.5;
      }
    }

    // Category / Product type matching (high baseline +0.50 so category queries match catalog)
    for (const token of cleanTokens) {
      if (token === "biscuit" || token === "biskut" || token === "viscut" || token === "बिस्कुट" || token === "बिस्किट" || token === "cookies" || token === "cookie") {
        if (skuCategory === "biscuits") score += 0.50;
      } else if (token === "detergent" || token === "powder" || token === "surf" || token === "washing" || token === "डिटर्जेंट" || token === "पाउडर") {
        if (skuCategory === "detergent") score += 0.50;
      } else if (token === "chai" || token === "tea" || token === "patti" || token === "chay" || token === "चाय" || token === "चायपत्ती") {
        if (skuCategory === "tea") score += 0.55;
      } else if (token === "soap" || token === "saboon" || token === "sabun" || token === "साबुन") {
        if (skuCategory === "personal care" || skuCategory === "detergent") score += 0.50;
      } else if (token === "oil" || token === "tel" || token === "refined" || token === "तेल") {
        if (skuCategory === "cooking oil") score += 0.50;
      } else if (token === "maggi" || token === "noodles" || token === "मैगी") {
        if (skuCategory === "packaged foods") score += 0.55;
      }
    }

    // Pack size / weight matching (+0.3)
    for (const token of cleanTokens) {
      const isNumericOnly = /^\d+$/.test(token);
      if (!isNumericOnly && (skuPackSize.includes(token) || skuName.includes(token))) {
        score += 0.25;
      }
      // Specific size hints (e.g., "chhota" for 75g biscuits)
      if ((token === "chhota" || token === "chota" || token === "छोटा") && sku.code === "SKU-BS-075") {
        score += 0.35;
      }
      if ((token === "1kg" || token === "1 kilo" || token === "1kilo") && sku.packSize.includes("1 kg")) {
        score += 0.35;
      }
      if (token === "cake" && sku.name.includes("Cake")) {
        score += 0.35;
      }
    }

    if (score > 0.25) {
      candidates.push({
        sku,
        score: Math.min(1.0, Math.round(score * 100) / 100),
      });
    }
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);

  const matched = candidates.length > 0 && candidates[0].score >= 0.45 ? candidates[0].sku : null;

  return { matched, candidates: candidates.slice(0, 3) };
}

/**
 * Main Pure Deterministic Parsing Function for a single line utterance
 */
export function parseSingleUtterance(rawUtterance: string, skus: SeedSku[]): ParsedLineItem {
  const normalizedNumerals = normalizeNumerals(rawUtterance.trim());

  // 1. Strip and record explanatory case capacity clauses (e.g. "where a case contains 24 pkts")
  const { cleanedText: textAfterExplanatory, explanatoryCapacity } = extractAndStripExplanatoryClause(normalizedNumerals);

  // 2. Check for Partial / Broken Case Intent (e.g. "case of 20 mai se 15 dedo", "15 out of 20")
  const partialIntent = detectPartialCaseIntent(textAfterExplanatory);

  let rawTokens: string[];
  let qty: number | null = null;
  let unit: UnitType = "UNKNOWN";

  if (partialIntent) {
    qty = partialIntent.requestedPacks;
    unit = "PACK";
    const cleanedWithWeights = normalizeWeights(partialIntent.cleanedUtterance);
    rawTokens = cleanedWithWeights.split(/\s+/).filter((t) => t.length > 0);
  } else {
    const textWithWeights = normalizeWeights(textAfterExplanatory);
    rawTokens = textWithWeights.split(/\s+/).filter((t) => t.length > 0);
    const qtyResult = extractQuantity(rawTokens);
    qty = qtyResult.qty;
    const unitResult = extractUnit(qtyResult.remainingTokens);
    unit = unitResult.unit;
    rawTokens = unitResult.remainingTokens;
  }

  // 3. Match SKU from catalog
  const { matched, candidates } = matchSku(rawTokens, skus);

  // 4. Ambiguity & Broken Case Guardrail (Rules [A16] & [A36])
  let isAmbiguous = false;
  let ambiguityReason: AmbiguityReason = null;
  let brokenCaseInfo: import("./types").BrokenCaseInfo | null = null;

  // Broken master case detection:
  // Triggered when explicitly requesting a partial case ("mai se X") OR ordering fewer packs than a full case
  if (matched && unit === "PACK" && qty !== null && qty > 0 && (partialIntent !== null || qty < matched.unitsPerCase)) {
    isAmbiguous = true;
    ambiguityReason = "BROKEN_CASE";
    const caseCap = explanatoryCapacity || partialIntent?.caseCapacityMentioned || matched.unitsPerCase;
    brokenCaseInfo = {
      requestedPacks: qty,
      caseCapacity: caseCap,
      fullCaseRoundUp: Math.max(1, Math.ceil(qty / caseCap)),
      loosePackPrice: matched.packPrice,
      fullCasePrice: matched.dealerPrice,
    };
  } else if (unit === "UNKNOWN") {
    isAmbiguous = true;
    ambiguityReason = "MISSING_UNIT";
  } else if (!matched && candidates.length > 1 && Math.abs(candidates[0].score - candidates[1].score) < 0.15) {
    isAmbiguous = true;
    ambiguityReason = "MULTIPLE_CANDIDATES";
  } else if (!matched) {
    isAmbiguous = true;
    ambiguityReason = "UNKNOWN_SKU";
  }

  // Confidence calculation
  let confidence = 0.0;
  if (matched) confidence += 0.65;
  if (qty !== null && qty > 0) confidence += 0.15;
  if (unit !== "UNKNOWN") confidence += 0.2;
  confidence = Math.min(0.98, Math.round(confidence * 100) / 100);

  // Compute resolved quantities for cart (both wholesale cases and retail loose packs)
  let resolvedQtyCases = qty || 1;
  let resolvedQtyPacks = 0;
  if (unit === "PACK" && matched) {
    resolvedQtyPacks = qty || 1;
    // Wholesale case equivalent:
    resolvedQtyCases = Math.max(1, Math.ceil((qty || 1) / matched.unitsPerCase));
  } else if (unit === "CASE") {
    resolvedQtyCases = qty || 1;
    resolvedQtyPacks = 0;
  }

  return {
    id: `line_${crypto.randomUUID().slice(0, 8)}`,
    rawUtterance,
    extractedQty: qty,
    extractedUnit: unit,
    matchedSku: matched,
    confidence,
    isAmbiguous,
    ambiguityReason,
    candidates,
    resolvedQtyCases,
    resolvedQtyPacks,
    brokenCaseInfo,
  };
}

/**
 * Full Pipeline Implementation: Deterministic Multilingual Text Parser
 */
export class DeterministicTextParserPipeline implements OrderParserPipeline {
  public name = "rules_deterministic";

  public async parseText(rawText: string, context?: ParserContext): Promise<ParseResult> {
    const activeSkus = context?.availableSkus || SEED_SKUS;
    const rawLines = splitOrderTextIntoLines(rawText);

    const parsedLines = rawLines.map((utterance) => parseSingleUtterance(utterance, activeSkus));
    const ambiguousCount = parsedLines.filter((l) => l.isAmbiguous).length;

    return {
      success: parsedLines.length > 0,
      rawText,
      lines: parsedLines,
      totalLines: parsedLines.length,
      ambiguousCount,
      pipelineName: this.name,
    };
  }
}

// Global default instance
export const deterministicTextParser = new DeterministicTextParserPipeline();
