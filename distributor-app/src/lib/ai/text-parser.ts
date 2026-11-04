import { dbStore } from "@/db/store";
import { SeedSku } from "@/db/seed-data";
import {
  ParsedLineItem,
  ParseResult,
  UnitType,
  AmbiguityReason,
  SkuCandidate,
  OrderParserPipeline,
  ParserContext,
  BrokenCaseInfo,
} from "./types";
import { CandidateRetriever } from "./candidate-retriever";
import { defaultCalibratedScorer } from "./calibrated-scorer";

// Hindi Devanagari digit translation map
export const DEVANAGARI_DIGITS: Record<string, string> = {
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

// Comprehensive word numerals & local weights (English, Hinglish, and Devanagari Hindi)
export const WORD_NUMBERS: Record<string, number> = {
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
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  twenty: 20,
  twentyfive: 25,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
  half: 0.5,
  quarter: 0.25,

  // Hinglish Numerals
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
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnees: 19,
  bees: 20,
  pachees: 25,
  tees: 30,
  chalees: 40,
  pachas: 50,
  sau: 100,

  // Regional Jabalpur Vernacular Fractional Weights & Multipliers
  aadha: 0.5,
  adha: 0.5,
  sawa: 1.25,
  derh: 1.5,
  dedh: 1.5,
  dhai: 2.5,
  adhai: 2.5,
  pao: 0.25,
  pav: 0.25,
  paanv: 0.25,

  // Devanagari Hindi Numerals
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
  तेरह: 13,
  चौदह: 14,
  पंद्रह: 15,
  सोलह: 16,
  सत्रह: 17,
  अठारह: 18,
  उन्नीस: 19,
  बीस: 20,
  पच्चीस: 25,
  तीस: 30,
  पचास: 50,
  सौ: 100,
  आधा: 0.5,
  डेढ़: 1.5,
  ढाई: 2.5,
  सवा: 1.25,
  पाव: 0.25,
};

// Wholesale Master Case Keywords (Explicit Wholesale Packaging)
export const CASE_KEYWORDS = [
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
  "crate",
  "crates",
  "bora",
  "bori",
  "katta",
  "kattay",
  "पेटी",
  "पेटियां",
  "पेटिया",
  "कार्टन",
  "बॉक्स",
  "बोरी",
  "कट्टा",
];

// Retail Loose Pack Keywords (Single Consumer Units)
export const PACK_KEYWORDS = [
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
  "tikiya",
  "tikki",
  "tikia",
  "nang",
  "पैकेट",
  "पैक",
  "पीस",
  "पाउच",
  "टिकिया",
  "नग",
];

// Ambiguous Unit Keywords ("Dabba" Invariant [A16] Guardrail)
// In MP Kirana trade, "dabba" can mean an oil tin (15L), an inner carton (12-24 pkts), or a master case.
export const AMBIGUOUS_UNIT_KEYWORDS = [
  "dabba",
  "dabbe",
  "dibba",
  "dibbe",
  "डिब्बा",
  "डिब्बे",
  "डब्बा",
  "डब्बे",
];

// Conversational filler & noise words in Jabalpur kirana trade
export const NOISE_WORDS = [
  "bhaiya",
  "bhayya",
  "bhai",
  "sethji",
  "seth",
  "babuji",
  "ji",
  "sir",
  "chahiye",
  "bhejo",
  "bhej",
  "dena",
  "dedo",
  "de",
  "do",
  "likho",
  "likh",
  "likhiye",
  "order",
  "jaldi",
  "turant",
  "urgent",
  "please",
  "aur",
  "and",
  "plus",
  "tatha",
  "kal",
  "aaj",
  "subah",
  "sham",
  "shaam",
  "parchi",
  "list",
  "namaste",
  "ram",
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
  "सेठजी",
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
  "का",
  "की",
  "के",
  "को",
  "से",
  "में",
  "मे",
];

// Tier 0: Data-Driven Regional Alias Table for Jabalpur FMCG kirana vernacular
export const SEED_ALIASES: Record<string, string> = {
  // Parle-G 75g (SKU-BS-075)
  "pila wala": "SKU-BS-075",
  "pila biscuit": "SKU-BS-075",
  "biscuit pila": "SKU-BS-075",
  "peela wala": "SKU-BS-075",
  "peela biscuit": "SKU-BS-075",
  "pila": "SKU-BS-075",
  "peela": "SKU-BS-075",
  "parle pila": "SKU-BS-075",
  "parle chhota": "SKU-BS-075",
  "chhota parle": "SKU-BS-075",
  "chhota biscuit": "SKU-BS-075",
  "chota biscuit": "SKU-BS-075",
  "biscuit chhota": "SKU-BS-075",
  "biscuit chota": "SKU-BS-075",
  "parleg": "SKU-BS-075",
  "parle-g": "SKU-BS-075",
  "parle g": "SKU-BS-075",
  "parle g pila wala": "SKU-BS-075",
  "parle g pila": "SKU-BS-075",
  "parle": "SKU-BS-075",
  "gluco": "SKU-BS-075",
  "glucose": "SKU-BS-075",
  "glucose biscuit": "SKU-BS-075",
  "पीला वाला": "SKU-BS-075",
  "पीला": "SKU-BS-075",
  "छोटा बिस्कुट": "SKU-BS-075",
  "छोटा बिस्किट": "SKU-BS-075",
  "बिस्कुट छोटा": "SKU-BS-075",
  "पारले": "SKU-BS-075",
  "पारले जी": "SKU-BS-075",

  // Britannia Good Day 120g (SKU-BS-GD120)
  "good day": "SKU-BS-GD120",
  "goodday": "SKU-BS-GD120",
  "butter cookies": "SKU-BS-GD120",
  "butter cookie": "SKU-BS-GD120",
  "gud day": "SKU-BS-GD120",
  "गुड डे": "SKU-BS-GD120",
  "बटर कुकीज़": "SKU-BS-GD120",

  // Britannia Marie Gold 250g (SKU-BS-MG250)
  "marie gold": "SKU-BS-MG250",
  "marie": "SKU-BS-MG250",
  "mariegold": "SKU-BS-MG250",
  "mari gold": "SKU-BS-MG250",
  "chai biscuit": "SKU-BS-MG250",
  "मैरी गोल्ड": "SKU-BS-MG250",
  "मारी गोल्ड": "SKU-BS-MG250",

  // Ghadi Detergent Powder 1kg (SKU-DT-1KG)
  "ghadi powder": "SKU-DT-1KG",
  "ghari powder": "SKU-DT-1KG",
  "ghadi 1kg": "SKU-DT-1KG",
  "kapde dhone wala ghadi": "SKU-DT-1KG",
  "kapde dhone wala powder": "SKU-DT-1KG",
  "kapde dhone ghadi": "SKU-DT-1KG",
  "detergent powder 1kg": "SKU-DT-1KG",
  "detergent powder": "SKU-DT-1KG",
  "घड़ी पाउडर": "SKU-DT-1KG",
  "घड़ी डिटर्जेंट पाउडर": "SKU-DT-1KG",
  "घड़ी डिटर्जेंट": "SKU-DT-1KG",
  "घडी डिटर्जेंट": "SKU-DT-1KG",

  // Surf Excel 1kg (SKU-DT-SX1KG)
  "surf excel": "SKU-DT-SX1KG",
  "surf": "SKU-DT-SX1KG",
  "bada surf excel": "SKU-DT-SX1KG",
  "bada surf": "SKU-DT-SX1KG",
  "safed powder": "SKU-DT-SX1KG",
  "quick wash": "SKU-DT-SX1KG",
  "सर्फ एक्सेल": "SKU-DT-SX1KG",
  "सर्फ": "SKU-DT-SX1KG",

  // Ghadi Detergent Cake 250g (SKU-DT-CK250)
  "ghadi cake": "SKU-DT-CK250",
  "ghadi sabun": "SKU-DT-CK250",
  "ghadi tikiya": "SKU-DT-CK250",
  "detergent cake": "SKU-DT-CK250",
  "kapde dhone ki tikiya": "SKU-DT-CK250",
  "kapde ki tikiya": "SKU-DT-CK250",
  "kapde tikiya": "SKU-DT-CK250",
  "bartan bar": "SKU-DT-CK250",
  "ghadi bar": "SKU-DT-CK250",
  "घड़ी साबुन": "SKU-DT-CK250",
  "घड़ी टिकिया": "SKU-DT-CK250",

  // Maggi 2-Minute Noodles 70g (SKU-ND-MG70 / SKU-FD-MG070)
  "maggi": "SKU-ND-MG70",
  "maggi noodles": "SKU-ND-MG70",
  "2 minute noodles": "SKU-ND-MG70",
  "मैगी": "SKU-ND-MG70",
  "मैगी नूडल्स": "SKU-ND-MG70",

  // Wagh Bakri Tea 250g (SKU-TE-250)
  "wagh bakri": "SKU-TE-250",
  "wagh bakri tea": "SKU-TE-250",
  "wagh bakri chai": "SKU-TE-250",
  "bagh bakri": "SKU-TE-250",
  "bakri chai": "SKU-TE-250",
  "tea leaf 250g": "SKU-TE-250",
  "tea leaf": "SKU-TE-250",
  "वाघ बकरी": "SKU-TE-250",
  "वाघ बकरी चाय": "SKU-TE-250",

  // Tata Tea Gold 500g (SKU-TE-TT500)
  "tata tea": "SKU-TE-TT500",
  "tata tea gold": "SKU-TE-TT500",
  "tata gold": "SKU-TE-TT500",
  "shakti chai": "SKU-TE-TT500",
  "kadak chai": "SKU-TE-TT500",
  "kadak patti": "SKU-TE-TT500",
  "टाटा टी": "SKU-TE-TT500",
  "टाटा गोल्ड": "SKU-TE-TT500",
  "शक्ति चाय": "SKU-TE-TT500",

  // Dettol Bathing Soap 125g (SKU-PC-DT125)
  "dettol": "SKU-PC-DT125",
  "dettol soap": "SKU-PC-DT125",
  "dettol sabun": "SKU-PC-DT125",
  "nahane wala dettol": "SKU-PC-DT125",
  "bathing soap": "SKU-PC-DT125",
  "डेटॉल साबुन": "SKU-PC-DT125",
  "डेटॉल": "SKU-PC-DT125",

  // Lifebuoy Soap 100g (SKU-PC-LB100)
  "lifebuoy": "SKU-PC-LB100",
  "lifebuoy soap": "SKU-PC-LB100",
  "lifebuoy sabun": "SKU-PC-LB100",
  "lal sabun": "SKU-PC-LB100",
  "लाइफबॉय": "SKU-PC-LB100",

  // Fortune Refined Sunlite Oil 1L (SKU-OL-FT1L)
  "fortune": "SKU-OL-FT1L",
  "fortune oil": "SKU-OL-FT1L",
  "fortune tel": "SKU-OL-FT1L",
  "surajmukhi tel": "SKU-OL-FT1L",
  "surajmukhi": "SKU-OL-FT1L",
  "sunflower oil": "SKU-OL-FT1L",
  "chidiya tel": "SKU-OL-FT1L",
  "refine tel": "SKU-OL-FT1L",
  "refined oil": "SKU-OL-FT1L",
  "mitha tel": "SKU-OL-FT1L",
  "meetha tel": "SKU-OL-FT1L",
  "cooking oil": "SKU-OL-FT1L",
  "फॉर्च्यून तेल": "SKU-OL-FT1L",
  "सूरजमुखी तेल": "SKU-OL-FT1L",
  "रिफाइंड तेल": "SKU-OL-FT1L",
};

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
    if (/^\d+(\.\d+)?$/.test(rawQty)) {
      qty = parseFloat(rawQty);
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
    if (/^\d+(\.\d+)?$/.test(rawQty)) {
      qty = parseFloat(rawQty);
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

export const ALL_UNIT_KEYWORDS = [
  ...CASE_KEYWORDS,
  ...PACK_KEYWORDS,
  ...AMBIGUOUS_UNIT_KEYWORDS,
  "kg",
  "kilo",
  "किलो",
  "g",
  "gm",
  "gram",
  "लीटर",
  "ltr",
  "liter",
  "litre",
  "tin",
  "टिन",
];

const CONVERSATIONAL_PATTERNS = [
  /\b(?:namaste|hello|pranam|ram\s*ram|salaam|namaskar)\b/i,
  /\b(?:order\s*likho|order\s*note|order\s*bhejo|order\s*hai|likhiye)\b/i,
  /\b(?:bol\s*raha\s*hu|se\s*bol\s*rahe|store\s*se|dukan\s*se|market\s*se)\b/i,
  /\b(?:delivery\s*(?:karwa|karva|karna|karana|dena|karo|bhejo))\b/i,
  /\b(?:kal\s*subah|subah\s*tak|shaam\s*ko|jaldi\s*(?:bhejo|dena)|urgent\s*hai)\b/i,
  /\b(?:baaki\s*kal|itna\s*hi|aur\s*kuch\s*nahi|shukriya|dhanyawad|thanks)\b/i,
];

export function isConversationalFiller(segment: string): boolean {
  const norm = segment.toLowerCase().trim();
  if (norm.length === 0) return true;

  // If segment contains any numeric quantity, it is NOT a filler
  if (/\d/.test(norm)) return false;

  // Check word numbers (e.g. ek, do, teen, aadha, derh)
  const words = norm
    .replace(/[.,!?:;]+/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0);
  for (const w of words) {
    if (WORD_NUMBERS[w] !== undefined) return false;
  }

  // Check packaging unit keywords (peti, case, pack, dabba, carton, piece) on word boundaries
  for (const u of ALL_UNIT_KEYWORDS) {
    const regex = new RegExp(`(^|\\s)${u}($|\\s|[0-9])`, "i");
    if (regex.test(norm)) return false;
  }

  // If it matches any conversational greeting or footer pattern, it's filler
  for (const pat of CONVERSATIONAL_PATTERNS) {
    if (pat.test(norm)) return true;
  }

  // If every word in the segment is a noise word
  const nonNoiseWords = words.filter((w) => !NOISE_WORDS.includes(w) && w.length > 1);
  if (nonNoiseWords.length === 0) return true;

  return false;
}

/**
 * Splits raw multi-item order text into individual item lines
 */
export function splitOrderTextIntoLines(rawText: string): string[] {
  const cleaned = normalizeNumerals(rawText.trim());

  // Split on newlines, semicolons, or comma/plus delimiters
  const rawSegments = cleaned
    .split(/\r?\n|;|\band\b|\baur\b|\bतथा\b|\+/i)
    .flatMap((seg) => seg.split(/,(?=\s*\d|\s*[a-zA-Z\u0900-\u097F]+)/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const nonFiller = rawSegments.filter((s) => !isConversationalFiller(s));
  return nonFiller.length > 0 ? nonFiller : rawSegments;
}

/**
 * Extracts numeric quantity from an utterance, supporting digits, word numbers, multipliers (darjan/dozen), and fractions
 */
function extractQuantity(tokens: string[]): { qty: number | null; remainingTokens: string[] } {
  const remaining: string[] = [];
  let detectedQty: number | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();

    // Check multiplier: darjan / dozen / दर्जन
    if (token === "darjan" || token === "darzan" || token === "dozen" || token === "दर्जन") {
      detectedQty = (detectedQty || 1) * 12;
      continue;
    }

    // Direct numeric digits (e.g., "5", "10", "2.5")
    if (/^\d+(\.\d+)?$/.test(token) && detectedQty === null) {
      detectedQty = parseFloat(token);
      continue;
    }

    // Word numeral or local fractional weight (e.g., "paanch", "do", "aadha", "sawa", "derh", "पाँच")
    if (WORD_NUMBERS[token] !== undefined && detectedQty === null) {
      detectedQty = WORD_NUMBERS[token];
      continue;
    }

    remaining.push(tokens[i]);
  }

  return { qty: detectedQty, remainingTokens: remaining };
}

/**
 * Detects unit of measure (CASE vs PACK vs KG vs DABBA vs UNKNOWN)
 * In accordance with Invariant [A16], "dabba" is treated as DABBA (ambiguous) rather than CASE!
 */
function extractUnit(tokens: string[]): { unit: UnitType; remainingTokens: string[] } {
  const remaining: string[] = [];
  let detectedUnit: UnitType = "UNKNOWN";

  for (const token of tokens) {
    const clean = token.toLowerCase();

    // Check ambiguous "dabba" first
    if (AMBIGUOUS_UNIT_KEYWORDS.includes(clean) && detectedUnit === "UNKNOWN") {
      detectedUnit = "DABBA";
      continue;
    }

    // Master wholesale case
    if (CASE_KEYWORDS.includes(clean) && detectedUnit === "UNKNOWN") {
      detectedUnit = "CASE";
      continue;
    }

    // Retail loose packs
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
 * Tier 0 & Tier 2: Candidate Retrieval & Matching
 * Combines exact alias lookup with Cormack RRF (Reciprocal Rank Fusion k=60)
 */
export function matchSkuWithRetrieval(
  queryTokens: string[],
  skus: SeedSku[],
  retailerAliases?: Record<string, string>
): { matched: SeedSku | null; candidates: SkuCandidate[]; aliasHit: boolean } {
  const mergedAliases = { ...SEED_ALIASES, ...(retailerAliases || {}) };

  const findSkuByCode = (code: string): SeedSku | undefined => {
    return skus.find(
      (s) => s.code.toLowerCase() === code.toLowerCase() || s.id.toLowerCase() === code.toLowerCase()
    );
  };

  // 1. TIER 0: Exact or N-Gram Merchant Alias Lookup on Pre-Filtered Tokens
  const rawCleaned = queryTokens
    .map((t) => t.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, ""))
    .filter((t) => t.length > 0);

  const rawPhrase = rawCleaned.join(" ");
  if (mergedAliases[rawPhrase]) {
    const targetSku = findSkuByCode(mergedAliases[rawPhrase]);
    if (targetSku) {
      return { matched: targetSku, candidates: [{ sku: targetSku, score: 1.0 }], aliasHit: true };
    }
  }

  // Check n-grams of rawCleaned
  for (let n = Math.min(rawCleaned.length, 5); n >= 2; n--) {
    for (let i = 0; i <= rawCleaned.length - n; i++) {
      const slice = rawCleaned.slice(i, i + n);
      const sub = slice.join(" ");
      const subSorted = [...slice].sort().join(" ");
      const matchedCode = mergedAliases[sub] || mergedAliases[subSorted];
      if (matchedCode) {
        const targetSku = findSkuByCode(matchedCode);
        if (targetSku) {
          return { matched: targetSku, candidates: [{ sku: targetSku, score: 0.98 }], aliasHit: true };
        }
      }
    }
  }

  // 2. Clean tokens by filtering general conversational noise
  const cleanTokens = rawCleaned.filter((t) => !NOISE_WORDS.includes(t));
  const queryPhrase = cleanTokens.join(" ");
  const queryPhraseSorted = [...cleanTokens].sort().join(" ");

  // Check filtered phrase hits
  if (mergedAliases[queryPhrase] || mergedAliases[queryPhraseSorted]) {
    const skuCode = mergedAliases[queryPhrase] || mergedAliases[queryPhraseSorted];
    const targetSku = findSkuByCode(skuCode);
    if (targetSku) {
      return {
        matched: targetSku,
        candidates: [{ sku: targetSku, score: 1.0 }],
        aliasHit: true,
      };
    }
  }

  // Check single token aliases
  for (const token of cleanTokens) {
    if (mergedAliases[token]) {
      const skuCode = mergedAliases[token];
      const targetSku = findSkuByCode(skuCode);
      if (targetSku) {
        return {
          matched: targetSku,
          candidates: [{ sku: targetSku, score: 0.90 }],
          aliasHit: true,
        };
      }
    }
  }

  // 3. TIER 2: Cormack Reciprocal Rank Fusion (RRF k=60) Candidate Retrieval
  const retriever = new CandidateRetriever(skus, 60);

  // Out-of-catalog guardrail: Prevent hardware, automotive, or non-catalog snacks from matching FMCG
  const KNOWN_OOC_KEYWORDS = [
    "chips",
    "lays",
    "kurkure",
    "bingo",
    "doritos",
    "coke",
    "pepsi",
    "sprite",
    "thums",
    "thumsup",
    "spark",
    "sparkplug",
    "tyre",
    "tire",
  ];
  const isOutOfCatalog = cleanTokens.some((t) => KNOWN_OOC_KEYWORDS.includes(t));
  if (isOutOfCatalog) {
    const fallbackCandidates = skus.slice(0, 3).map((s) => ({ sku: s, score: 0.0 }));
    return { matched: null, candidates: fallbackCandidates, aliasHit: false };
  }

  const rankedCandidates = retriever.retrieve(cleanTokens, 3);
  const candidates: SkuCandidate[] = retriever.toSkuCandidates(rankedCandidates);

  const top = candidates[0] || null;
  const runnerUp = candidates[1] || null;

  // Decision margin: Top candidate accepted if score >= 0.60 (requires multi-channel consensus)
  let matched: SeedSku | null = null;
  if (top && top.score >= 0.60) {
    matched = top.sku;
  }

  return { matched, candidates, aliasHit: false };
}

/**
 * Main Pure Deterministic & Calibrated Parsing Function for a single line utterance
 */
export function parseSingleUtterance(
  rawUtterance: string,
  skus: SeedSku[],
  retailerAliases?: Record<string, string>
): ParsedLineItem {
  const normalizedNumerals = normalizeNumerals(rawUtterance.trim());

  // 1. Strip and record explanatory case capacity clauses (e.g. "where a case contains 24 pkts")
  const { cleanedText: textAfterExplanatory, explanatoryCapacity } =
    extractAndStripExplanatoryClause(normalizedNumerals);

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

  // 3. Match SKU with Tier 0 Alias Table & Tier 2 RRF Retrieval
  let { matched, candidates, aliasHit } = matchSkuWithRetrieval(rawTokens, skus, retailerAliases);

  // If explanatoryCapacity is specified by user (e.g., "where a case contains 24 pkts"),
  // boost the candidate that matches the explicit unitsPerCase!
  if (explanatoryCapacity && candidates.length > 0) {
    const matchingCandidate = candidates.find((c) => c.sku.unitsPerCase === explanatoryCapacity);
    if (matchingCandidate) {
      matched = matchingCandidate.sku;
      candidates = [
        matchingCandidate,
        ...candidates.filter((c) => c.sku.code !== matchingCandidate.sku.code),
      ];
    }
  }

  // 4. Broken Case Pre-Check
  let isBrokenCase = false;
  let brokenCaseInfo: BrokenCaseInfo | null = null;

  if (matched && unit === "PACK" && qty !== null && qty > 0 && (partialIntent !== null || qty < matched.unitsPerCase)) {
    isBrokenCase = true;
    const caseCap = explanatoryCapacity || partialIntent?.caseCapacityMentioned || matched.unitsPerCase;
    brokenCaseInfo = {
      requestedPacks: qty,
      caseCapacity: caseCap,
      fullCaseRoundUp: Math.max(1, Math.ceil(qty / caseCap)),
      loosePackPrice: matched.packPrice,
      fullCasePrice: matched.dealerPrice,
    };
  }

  // 5. Tier 3: Calibrated Probabilistic Confidence Scoring via Logistic Sigmoid
  const scoreResult = defaultCalibratedScorer.score({
    aliasHit,
    topCandidateScore: candidates[0]?.score || 0.0,
    runnerUpScore: candidates[1]?.score || 0.0,
    unit,
    quantity: qty,
    isBrokenCase,
  });

  let confidence = scoreResult.confidence;
  let isAmbiguous = scoreResult.isAmbiguous;
  let ambiguityReason = scoreResult.ambiguityReason;

  // Invariant [A16]: Strict Guardrail against ungrounded / out-of-catalog items (e.g. "chips")
  if (!matched) {
    isAmbiguous = true;
    ambiguityReason = "UNKNOWN_SKU";
    confidence = Math.min(0.20, confidence);
  }

  // 6. Compute resolved quantities for cart
  let resolvedQtyCases = qty || 1;
  let resolvedQtyPacks = 0;
  if (unit === "PACK" && matched) {
    resolvedQtyPacks = qty || 1;
    resolvedQtyCases = Math.max(1, Math.ceil((qty || 1) / matched.unitsPerCase));
  } else if (unit === "CASE" || unit === "DABBA") {
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
    const activeSkus = context?.availableSkus || dbStore.getAllSkus();
    const rawLines = splitOrderTextIntoLines(rawText);

    const parsedLines = rawLines.map((utterance) =>
      parseSingleUtterance(utterance, activeSkus, context?.retailerAliases)
    );
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
