/**
 * Deterministic Phonetic Transliteration & Trade Lexicon Engine
 * Zero AI latency, zero API costs, pure client/server deterministic translation.
 * Translates arbitrary random catalogues and store names into natural Devanagari Hindi.
 */

// 1. High-frequency FMCG, Grocery, Packaging & Kirana Trade Lexicon
export const TRADE_WORD_MAP: Record<string, string> = {
  // Common Names, Surnames & Cities in MP / Jabalpur Mandi
  raju: "राजू",
  ram: "राम",
  shree: "श्री",
  shri: "श्री",
  sri: "श्री",
  kisan: "किसान",
  mahadev: "महादेव",
  everest: "एवरेस्ट",
  catch: "कैच",
  mdh: "एमडीएच",
  badshah: "बादशाह",
  ambika: "अंबिका",
  kanhaiya: "कन्हैया",
  balaji: "बालाजी",
  vimal: "विमल",
  patel: "पटेल",
  sharma: "शर्मा",
  verma: "वर्मा",
  gupta: "गुप्ता",
  agarwal: "अग्रवाल",
  agrawal: "अग्रवाल",
  jain: "जैन",
  singh: "सिंह",
  yadav: "यादव",
  tiwari: "तिवारी",
  mishra: "मिश्रा",
  pandey: "पांडेय",
  bajpai: "बाजपेई",
  chouksey: "चौकसे",
  jabalpur: "जबलपुर",
  indore: "इंदौर",
  bhopal: "भोपाल",
  gwalior: "ग्वालियर",
  ujjain: "उज्जैन",

  // Packaging & Wholesale Units
  case: "पेटी",
  cases: "पेटी",
  peti: "पेटी",
  pack: "पैकेट",
  packs: "पैकेट",
  packet: "पैकेट",
  packets: "पैकेट",
  pkt: "पैकेट",
  pkts: "पैकेट",
  box: "डब्बा",
  boxes: "डब्बे",
  dabba: "डब्बा",
  dabbe: "डब्बे",
  pouch: "पाउच",
  pouches: "पाउच",
  bottle: "बोतल",
  bottles: "बोतलें",
  btl: "बोतल",
  can: "टिन",
  cans: "टिन",
  tin: "टिन",
  tins: "टिन",
  jar: "जार",
  jars: "जार",
  bag: "बोरी",
  bags: "बोरी",
  piece: "पीस",
  pieces: "पीस",
  pc: "पीस",
  pcs: "पीस",
  unit: "यूनिट",
  units: "यूनिट",
  cut: "खुला",
  loose: "खुले",

  // Weights & Measures
  kg: "किलो",
  kgs: "किलो",
  kilo: "किलो",
  kilogram: "किलोग्राम",
  kilograms: "किलोग्राम",
  g: "ग्राम",
  gm: "ग्राम",
  gms: "ग्राम",
  gram: "ग्राम",
  grams: "ग्राम",
  l: "लीटर",
  lt: "लीटर",
  ltr: "लीटर",
  liter: "लीटर",
  litre: "लीटर",
  liters: "लीटर",
  litres: "लीटर",
  ml: "मिली",

  // Common Grocery Staples & Food Categories
  tea: "चाय",
  chai: "चाय",
  coffee: "कॉफी",
  sugar: "शक्कर",
  shakkar: "शक्कर",
  salt: "नमक",
  namak: "नमक",
  rice: "चावल",
  chawal: "चावल",
  basmati: "बासमती",
  oil: "तेल",
  tel: "तेल",
  mustard: "सरसों",
  sarson: "सरसों",
  refined: "रिफाइंड",
  soyabean: "सोयाबीन",
  soya: "सोया",
  sunflower: "सूरजमुखी",
  groundnut: "मूंगफली",
  ghee: "घी",
  butter: "मक्खन",
  makhan: "मक्खन",
  milk: "दूध",
  doodh: "दूध",
  cream: "क्रीम",
  flour: "आटा",
  atta: "आटा",
  maida: "मैदा",
  suji: "सूजी",
  sooji: "सूजी",
  rava: "रवा",
  besan: "बेसन",
  dal: "दाल",
  daal: "दाल",
  chana: "चना",
  moong: "मूंग",
  toor: "तुअर",
  tuar: "तुअर",
  arhar: "अरहर",
  urad: "उड़द",
  masoor: "मसूर",
  rajma: "राजमा",
  chhole: "छोले",
  spice: "मसाला",
  spices: "मसाले",
  masala: "मसाला",
  haldi: "हल्दी",
  turmeric: "हल्दी",
  mirch: "मिर्च",
  chilli: "मिर्च",
  chili: "मिर्च",
  dhaniya: "धनिया",
  coriander: "धनिया",
  jeera: "जीरा",
  cumin: "जीरा",
  garam: "गरम",
  hing: "हींग",
  biscuit: "बिस्कुट",
  biscuits: "बिस्कुट",
  cookie: "कुकीज",
  cookies: "कुकीज",
  rusk: "टोस्ट",
  toast: "टोस्ट",
  bread: "ब्रेड",
  cake: "केक",
  noodle: "नूडल्स",
  noodles: "नूडल्स",
  pasta: "पास्ता",
  sauce: "सॉस",
  ketchup: "केचप",
  jam: "जैम",
  pickle: "अचार",
  achar: "अचार",
  chips: "चिप्स",
  wafers: "वेफर्स",
  wafer: "वेफर्स",
  snack: "स्नैक्स",
  snacks: "स्नैक्स",
  choco: "चोको",
  chocolate: "चॉकलेट",
  namkeen: "नमकीन",
  bhujia: "भुजिया",
  sev: "सेव",
  mixture: "मिक्सचर",
  papad: "पापड़",

  // Personal Care & Home Care
  soap: "साबुन",
  soaps: "साबुन",
  bath: "नहाने का",
  bathing: "नहाने का",
  detergent: "डिटर्जेंट",
  washing: "धुलाई",
  powder: "पाउडर",
  bar: "बार",
  liquid: "तरल",
  dishwash: "बर्तन धोने का",
  shampoo: "शैम्पू",
  conditioner: "कंडीशनर",
  oil_hair: "हेयर ऑयल",
  hair: "बाल",
  paste: "पेस्ट",
  toothpaste: "टूथपेस्ट",
  brush: "ब्रश",
  toothbrush: "टूथब्रश",
  dant: "दंत",
  manjan: "मंजन",
  cream_skin: "क्रीम",
  lotion: "लोशन",
  talc: "टैल्कम",
  talcum: "टैल्कम",
  perfume: "इत्र",
  deodorant: "डियो",
  deo: "डियो",
  matchbox: "माचिस",
  match: "माचिस",
  agarbatti: "अगरबत्ती",
  dhoop: "धूपबत्ती",
  cleaner: "क्लीनर",
  floor: "फर्श",
  toilet: "शौचालय",

  // Business & Shop Descriptors
  store: "स्टोर",
  stores: "स्टोर",
  kirana: "किराना",
  general: "जनरल",
  provision: "प्रोविजन",
  provisions: "प्रोविजन",
  daily: "डेली",
  needs: "नीड्स",
  traders: "ट्रेडर्स",
  trader: "ट्रेडर्स",
  trading: "ट्रेडिंग",
  enterprise: "एंटरप्राइज",
  enterprises: "एंटरप्राइजेज",
  agency: "एजेंसी",
  agencies: "एजेंसी",
  distributor: "वितरक",
  distributors: "वितरक",
  wholesale: "थोक",
  retail: "फुटकर",
  retailer: "दुकानदार",
  bazaar: "बाजार",
  bazar: "बाजार",
  mart: "मार्ट",
  super: "सुपर",
  market: "मार्केट",
  hub: "हब",
  kendra: "केंद्र",
  bhandar: "भंडार",
  depot: "डिपो",
  point: "पॉइंट",
  corner: "कॉर्नर",
  shop: "दुकान",
  company: "कंपनी",
  co: "कंपनी",
  ltd: "लिमिटेड",
  pvt: "प्राइवेट",
  llp: "एलएलपी",
  brothers: "ब्रदर्स",
  bros: "ब्रदर्स",
  and: "व",
  new: "न्यू",
  fresh: "ताज़ा",
  pure: "शुद्ध",
  om: "ॐ",
  jai: "जय",
  ma: "माँ",
  maa: "माँ",
  special: "स्पेशल",
  gold: "गोल्ड",
  silver: "सिल्वर",
  diamond: "डायमंड",
  premium: "प्रीमियम",
  classic: "क्लासिक",
  family: "फैमिली",
  regular: "रेगुलर",
  mini: "मिनी",
  jumbo: "जंबो",
  king: "किंग",
  royal: "रॉयल",
  best: "बेस्ट",
  top: "टॉप",
  star: "स्टार",
};

// 2. Deterministic Digraphs & Syllable Mapping
const DIGRAPHS: Array<[string, string]> = [
  ["shree", "श्री"],
  ["shri", "श्री"],
  ["om", "ॐ"],
  ["ch", "च"],
  ["sh", "श"],
  ["kh", "ख"],
  ["gh", "घ"],
  ["th", "थ"],
  ["dh", "ध"],
  ["ph", "फ"],
  ["bh", "भ"],
  ["jh", "झ"],
  ["gy", "ज्ञ"],
  ["tr", "त्र"],
  ["ee", "ी"],
  ["oo", "ू"],
  ["ai", "ै"],
  ["au", "ौ"],
  ["ou", "ौ"],
  ["ea", "ी"],
  ["ay", "े"],
];

const CONSONANTS: Record<string, string> = {
  k: "क",
  g: "ग",
  c: "क",
  j: "ज",
  z: "ज़",
  t: "ट",
  d: "ड",
  n: "न",
  p: "प",
  f: "फ",
  b: "ब",
  m: "म",
  y: "य",
  r: "र",
  l: "ल",
  v: "व",
  w: "व",
  s: "स",
  h: "ह",
  x: "क्स",
  q: "क",
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  a: "अ",
  aa: "आ",
  i: "इ",
  ee: "ई",
  u: "उ",
  oo: "ऊ",
  e: "ए",
  ai: "ऐ",
  o: "ओ",
  au: "औ",
};

const MATRAS: Record<string, string> = {
  a: "ा",
  aa: "ा",
  i: "ि",
  ee: "ी",
  u: "ु",
  oo: "ू",
  e: "े",
  ai: "ै",
  o: "ो",
  au: "ौ",
};

/**
 * Phonetically transliterates a single Latin word into Devanagari
 */
export function phoneticTransliterateWord(word: string): string {
  const clean = word.toLowerCase().trim();
  if (!clean) return "";

  // 1. Direct trade dictionary match
  if (TRADE_WORD_MAP[clean]) {
    return TRADE_WORD_MAP[clean];
  }

  // 2. Syllable-by-syllable phonetic transcription
  let result = "";
  let i = 0;
  let lastWasConsonant = false;

  while (i < clean.length) {
    // Check two-character digraphs
    const twoChars = clean.slice(i, i + 2);
    let matchedDigraph = DIGRAPHS.find(([dg]) => dg === twoChars);

    if (matchedDigraph) {
      const devanagari = matchedDigraph[1];
      // Check if it's a vowel digraph
      if (["ी", "ू", "ै", "ौ", "े"].includes(devanagari)) {
        if (lastWasConsonant) {
          result += devanagari;
        } else {
          result += devanagari === "ी" ? "ई" : devanagari === "ू" ? "ऊ" : devanagari === "ै" ? "ऐ" : devanagari === "े" ? "ए" : "औ";
        }
        lastWasConsonant = false;
      } else {
        result += devanagari;
        lastWasConsonant = true;
      }
      i += 2;
      continue;
    }

    const char = clean[i];

    // Check single consonants
    if (CONSONANTS[char]) {
      const devConsonant = CONSONANTS[char];
      result += devConsonant;
      lastWasConsonant = true;
      i++;
      continue;
    }

    // Check vowels
    if (MATRAS[char]) {
      if (lastWasConsonant) {
        // In Hindi, short 'a' in the middle/end is often inherent, but for proper transliteration:
        if (char === "a") {
          // If followed by another vowel like 'aa', add 'ा'
          if (clean[i + 1] === "a") {
            result += "ा";
            i++;
          }
          // Inherent 'a' is implicit in Devanagari consonants
        } else {
          result += MATRAS[char];
        }
      } else {
        result += INDEPENDENT_VOWELS[char] || char;
      }
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Numbers, punctuation, non-alphabetic
    result += char;
    lastWasConsonant = false;
    i++;
  }

  return result;
}

/**
 * Universal Hindi Transliteration for ANY arbitrary SKU, Retailer, or product text.
 * Automatically decomposes quantities, units, numbers, and proper nouns.
 *
 * Example:
 * "Raju Kirana & General Store" -> "राजू किराना व जनरल स्टोर"
 * "Kisan Chana Dal 1kg" -> "किसान चना दाल 1 किलो"
 * "Everest Garam Masala 100g, case of 48" -> "एवरेस्ट गरम मसाला 100 ग्राम, पेटी 48"
 */
export function transliterateToHindi(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // If already contains Devanagari characters, return as is
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return trimmed;
  }

  // Pre-process fused quantity patterns like "100g", "1kg", "500ml", "1lt", "24pkts"
  const separated = trimmed
    .replace(/(\d+)\s*(kg|kgs|kilo|g|gm|gms|gram|grams|l|lt|ltr|litre|liter|ml|pkts|pkt|pcs|pc)\b/gi, "$1 $2")
    .replace(/case\s+of\s+(\d+)/gi, "पेटी $1")
    .replace(/pack\s+of\s+(\d+)/gi, "पैक $1");

  // Tokenize words, numbers, and delimiters
  const tokens = separated.split(/(\s+|[,/&+\-()])/);

  const translatedTokens = tokens.map((token) => {
    // Preserve whitespace and punctuation delimiters
    if (!token || /^\s+$/.test(token) || /^[,/+\-()]$/.test(token)) {
      return token;
    }

    if (token === "&") {
      return "व";
    }

    // Pure numbers
    if (/^\d+(\.\d+)?$/.test(token)) {
      return token;
    }

    const lower = token.toLowerCase();

    // 1. Direct vocabulary check
    if (TRADE_WORD_MAP[lower]) {
      return TRADE_WORD_MAP[lower];
    }

    // 2. Phonetic transcription for proper names / unknown brands
    return phoneticTransliterateWord(token);
  });

  return translatedTokens.join("").replace(/\s+/g, " ").trim();
}
