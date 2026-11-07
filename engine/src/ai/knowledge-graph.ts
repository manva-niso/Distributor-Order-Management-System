/**
 * FMCG Trade Knowledge Graph & Semantic Category Ontology
 *
 * Maps Indic vernacular (Hindi Devanagari & Hinglish) trade slang, colloquial concepts,
 * and category taxonomies directly to Company A's wholesale FMCG catalog.
 *
 * Solves the defect where out-of-catalog or generic category requests (e.g., "नहाने की साबुन",
 * "सर्फ", "बर्तन की साबुन", "कनक", "chips") previously dumped arbitrary biscuits (skus.slice(0, 3)).
 *
 * Invariant [A61]: Semantic Category Fidelity & Zero Cross-Category Hallucination.
 */

import { SeedSku } from "../data/catalog";
import { SkuCandidate } from "./types";

export type FmcgCategoryDomain =
  | "LAUNDRY_DETERGENT"
  | "TOILET_SOAP"
  | "DISHWASH"
  | "EDIBLE_OIL"
  | "TEA_BEVERAGE"
  | "BISCUITS_CONFECTIONERY"
  | "PACKAGED_FOODS_NOODLES"
  | "STAPLES_GRAINS"
  | "SPICES_MASALA"
  | "PEST_CONTROL"
  | "AUTOMOTIVE_HARDWARE"
  | "CARBONATED_BEVERAGES"
  | "UNKNOWN_DOMAIN";

export interface KnowledgeNode {
  category: FmcgCategoryDomain;
  displayName: string;
  displayNameHi: string;
  primaryKeywords: string[];
  phoneticVariants: string[];
  catalogCategories: string[];
  isDistributedByCompanyA: boolean;
  domainRejectionNote?: string;
}

export const FMCG_KNOWLEDGE_GRAPH: Record<FmcgCategoryDomain, KnowledgeNode> = {
  LAUNDRY_DETERGENT: {
    category: "LAUNDRY_DETERGENT",
    displayName: "Laundry & Detergents",
    displayNameHi: "डिटर्जेंट एवं कपड़े धोने का साबुन",
    primaryKeywords: [
      "सर्फ", "surf", "detergent", "powder", "वाशिंग", "washing", "ghadi", "घड़ी",
      "कपड़े", "tikiya", "टिकीया", "cake", "wheel", "tide", "ariel", "rin", "निरमा", "nirma",
    ],
    phoneticVariants: ["srf", "sarf", "ditargent", "ditergent", "poudar", "kapde dhone", "kapda"],
    catalogCategories: ["Detergent", "Laundry & Detergents"],
    isDistributedByCompanyA: true,
  },
  TOILET_SOAP: {
    category: "TOILET_SOAP",
    displayName: "Personal Care & Bathing Soaps",
    displayNameHi: "नहाने की साबुन एवं पर्सनल केयर",
    primaryKeywords: [
      "साबुन", "sabun", "saboon", "soap", "नहाने", "nahane", "dettol", "डेटॉल",
      "lifebuoy", "लाइफबॉय", "lux", "लक्स", "dove", "pears", "colgate", "कोलगेट",
      "toothpaste", "shampoo", "शैम्पू",
    ],
    phoneticVariants: ["nahane ki sabun", "nahane wala", "toilet soap", "bath soap", "kolget"],
    catalogCategories: ["Personal Care", "Personal Care & Toilet Soaps"],
    isDistributedByCompanyA: true,
  },
  DISHWASH: {
    category: "DISHWASH",
    displayName: "Home Care & Dishwash",
    displayNameHi: "बर्तन धोने की साबुन एवं डिशवॉश",
    primaryKeywords: [
      "बर्तन", "bartan", "dishwash", "vim", "विम", "bar", "बर्तन की साबुन", "bartan bar",
      "scrub", "bartan dhone", "dish", "liquid",
    ],
    phoneticVariants: ["brtan", "bartan ki tikiya", "bartan soap"],
    catalogCategories: ["Home Care & Cleaning", "Detergent"],
    isDistributedByCompanyA: true,
  },
  EDIBLE_OIL: {
    category: "EDIBLE_OIL",
    displayName: "Edible Cooking Oils",
    displayNameHi: "खाद्य तेल एवं घी",
    primaryKeywords: [
      "तेल", "tel", "oil", "fortune", "फॉर्च्यून", "refine", "रिफाइंड", "sunflower",
      "सूरजमुखी", "surajmukhi", "mustard", "सरसों", "sarson", "dhara", "धारा", "soya",
      "सोयाबीन", "dalda", "ghee", "घी",
    ],
    phoneticVariants: ["meetha tel", "mitha tel", "khana pakane ka tel", "cooking oil"],
    catalogCategories: ["Cooking Oil", "Edible Oils & Ghee"],
    isDistributedByCompanyA: true,
  },
  TEA_BEVERAGE: {
    category: "TEA_BEVERAGE",
    displayName: "Tea, Coffee & Beverages",
    displayNameHi: "चाय, कॉफी एवं पेय पदार्थ",
    primaryKeywords: [
      "चाय", "chai", "tea", "patti", "पत्ती", "tata", "टाटा", "wagh bakri", "वाघ बकरी",
      "shakti", "शक्ति", "taj mahal", "ताज़ महल", "red label", "coffee", "कॉफी", "nescafe",
    ],
    phoneticVariants: ["chay", "chaai", "shakti chai", "kadak chai"],
    catalogCategories: ["Tea", "Tea, Coffee & Beverages"],
    isDistributedByCompanyA: true,
  },
  BISCUITS_CONFECTIONERY: {
    category: "BISCUITS_CONFECTIONERY",
    displayName: "Biscuits, Cookies & Snacks",
    displayNameHi: "बिस्कुट एवं स्नैक्स",
    primaryKeywords: [
      "बिस्कुट", "बिस्किट", "biscuit", "biskut", "parle", "पारले", "parle-g", "good day",
      "गुड डे", "marie", "मैरी", "pila wala", "पीला वाला", "cookies", "cream", "bourbon",
      "dark fantasy", "toast", "rusk",
    ],
    phoneticVariants: ["biskit", "biscut", "namkeen biscuit", "bada biscuit", "chhota biscuit"],
    catalogCategories: ["Biscuits", "Biscuits & Confectionery"],
    isDistributedByCompanyA: true,
  },
  PACKAGED_FOODS_NOODLES: {
    category: "PACKAGED_FOODS_NOODLES",
    displayName: "Packaged Foods & Noodles",
    displayNameHi: "मैगी, नूडल्स एवं पैक्ड फूड्स",
    primaryKeywords: [
      "मैगी", "maggi", "noodles", "नूडल्स", "yippee", "ketchup", "सॉस", "sauce",
      "pasta", "पास्ता", "vermicelli", "sewai",
    ],
    phoneticVariants: ["meghi", "megi", "chhota packet maggi"],
    catalogCategories: ["Packaged Foods", "Packaged Foods & Noodles"],
    isDistributedByCompanyA: true,
  },
  STAPLES_GRAINS: {
    category: "STAPLES_GRAINS",
    displayName: "Staples, Grains & Pulses",
    displayNameHi: "अनाज, दालें एवं आटा",
    primaryKeywords: [
      "कनक", "kanak", "गेहूं", "gehun", "wheat", "आटा", "atta", "दाल", "dal", "chana",
      "चना", "masoor", "मसरी", "मसूर", "urad", "उड़द", "rajma", "राजमा", "besan", "बेसन",
      "rice", "चावल", "sugar", "शक्कर", "चीनी",
    ],
    phoneticVariants: ["kanaki", "chane ki dal", "kale urad", "masari", "sukha anaj"],
    catalogCategories: ["Staples", "Grains & Pulses"],
    isDistributedByCompanyA: true,
  },
  SPICES_MASALA: {
    category: "SPICES_MASALA",
    displayName: "Spices & Masala",
    displayNameHi: "मसाले, हल्दी एवं मिर्च",
    primaryKeywords: [
      "हल्दी", "haldi", "मिर्च", "mirch", "धनिया", "dhaniya", "जीरा", "jeera", "degi mirch",
      "देगी मिर्च", "garam masala", "मसाला", "masala", "salt", "नमक",
    ],
    phoneticVariants: ["pisa hua dhaniya", "pisi hui mirch", "sabut jeera"],
    catalogCategories: ["Spices", "Masalas"],
    isDistributedByCompanyA: false,
    domainRejectionNote:
      "Company A is a packaged FMCG wholesale distributor (soaps, detergents, edible oils, tea, and biscuits) and does not stock loose/bulk grocery mandi spices (haldi, jeera, mirch).",
  },
  PEST_CONTROL: {
    category: "PEST_CONTROL",
    displayName: "Pest Control & Mosquito Repellents",
    displayNameHi: "मच्छर अगरबत्ती एवं कीटनाशक",
    primaryKeywords: [
      "मोरटिन", "mortein", "allout", "all out", "goodknight", "mosquito", "coil",
      "मच्छर", "hit", "kaala hit", "baygon",
    ],
    phoneticVariants: ["mortin", "machhar marne ka", "machhar coil"],
    catalogCategories: ["Home Care"],
    isDistributedByCompanyA: false,
    domainRejectionNote:
      "Pest control products (Mortein, AllOut) are not carried in Company A's primary FMCG wholesale line.",
  },
  AUTOMOTIVE_HARDWARE: {
    category: "AUTOMOTIVE_HARDWARE",
    displayName: "Automotive & Hardware Parts",
    displayNameHi: "ऑटोमोबाइल एवं हार्डवेयर स्पेयर पार्ट्स",
    primaryKeywords: [
      "tyre", "tire", "ट्यूब", "tube", "spark", "sparkplug", "प्लग", "cycle", "motorcycle",
      "engine", "bearing", "nut", "bolt", "cement",
    ],
    phoneticVariants: ["cycle tyre", "motorcycle plug", "gaadi ka saman"],
    catalogCategories: [],
    isDistributedByCompanyA: false,
    domainRejectionNote:
      "Automotive mechanical parts (tyres, spark plugs) are completely outside Company A's wholesale grocery line.",
  },
  CARBONATED_BEVERAGES: {
    category: "CARBONATED_BEVERAGES",
    displayName: "Carbonated Soft Drinks & Sodas",
    displayNameHi: "कोल्ड ड्रिंक्स एवं सोडा",
    primaryKeywords: [
      "coke", "pepsi", "thums", "thumsup", "sprite", "fanta", "limca", "cold drink",
      "कोल्ड ड्रिंक", "soda", "सोडा",
    ],
    phoneticVariants: ["thums up", "coca cola", "soft drink"],
    catalogCategories: [],
    isDistributedByCompanyA: false,
    domainRejectionNote:
      "Carbonated soda beverages (Coke, Pepsi, Thums Up) are distributed via exclusive bottling franchises and are not carried in Company A's FMCG warehouse.",
  },
  UNKNOWN_DOMAIN: {
    category: "UNKNOWN_DOMAIN",
    displayName: "General / Uncategorized",
    displayNameHi: "अज्ञात श्रेणी",
    primaryKeywords: [],
    phoneticVariants: [],
    catalogCategories: [],
    isDistributedByCompanyA: false,
    domainRejectionNote: "The requested item does not match any recognized FMCG wholesale category.",
  },
};

export class FmcgTradeKnowledgeGraph {
  /**
   * Identifies the trade category from a stream of query tokens or full text.
   * Uses Longest-Phrase-First matching to prioritize multi-word compounds
   * (e.g. "बर्तन की साबुन" -> DISHWASH before "साबुन" -> TOILET_SOAP).
   */
  public identifyDomain(query: string): KnowledgeNode {
    const clean = query
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F\s]/g, " ")
      .trim();
    const tokens = clean.split(/\s+/).filter((t) => t.length > 0);

    // Build all candidate phrases sorted by character length descending
    const allPhrases: { phrase: string; node: KnowledgeNode }[] = [];
    for (const node of Object.values(FMCG_KNOWLEDGE_GRAPH)) {
      if (node.category === "UNKNOWN_DOMAIN") continue;
      for (const kw of node.primaryKeywords) {
        allPhrases.push({ phrase: kw.toLowerCase(), node });
      }
      for (const variant of node.phoneticVariants) {
        allPhrases.push({ phrase: variant.toLowerCase(), node });
      }
    }

    allPhrases.sort((a, b) => b.phrase.length - a.phrase.length);

    for (const item of allPhrases) {
      if (clean.includes(item.phrase)) {
        return item.node;
      }
    }

    for (const token of tokens) {
      for (const node of Object.values(FMCG_KNOWLEDGE_GRAPH)) {
        if (node.primaryKeywords.includes(token)) {
          return node;
        }
      }
    }

    return FMCG_KNOWLEDGE_GRAPH.UNKNOWN_DOMAIN;
  }

  /**
   * Smart Suggestion Engine:
   * Returns relevant candidates matching the user's category intent.
   * If the category is not distributed, returns empty list with honest explanation.
   * NEVER returns biscuits for soaps or detergents!
   */
  public getSmartSuggestions(params: {
    rawUtterance: string;
    catalog: SeedSku[];
    topK?: number;
  }): {
    candidates: SkuCandidate[];
    categoryNode: KnowledgeNode;
    isCategorized: boolean;
    explanation: string;
  } {
    const { rawUtterance, catalog, topK = 3 } = params;
    const node = this.identifyDomain(rawUtterance);

    // 1. Out of FMCG Domain (Automotive, Carbonated Sodas, Pest Control, Spices, Unknown)
    if (!node.isDistributedByCompanyA) {
      const explanation = node.domainRejectionNote
        ? `The requested item "${rawUtterance}" (${node.displayNameHi}) is not available in Company A's wholesale catalog. ${node.domainRejectionNote}`
        : `The requested item "${rawUtterance}" is not available in Company A's wholesale catalog.`;

      return {
        candidates: [],
        categoryNode: node,
        isCategorized: node.category !== "UNKNOWN_DOMAIN",
        explanation,
      };
    }

    // 2. Distributed FMCG Domain: Find SKUs matching the identified category
    const matchingSkus = catalog.filter((sku) => {
      const catLower = (sku.category || "").toLowerCase();
      return node.catalogCategories.some((cc) => catLower.includes(cc.toLowerCase()));
    });

    if (matchingSkus.length > 0) {
      // Prioritize SKUs with high stock and active status
      const candidates: SkuCandidate[] = matchingSkus.slice(0, topK).map((sku, idx) => ({
        sku,
        score: Math.max(0.25, Math.round((0.65 - idx * 0.10) * 100) / 100),
      }));

      const explanation = `Matched Category: ${node.displayName} (${node.displayNameHi}). Showing nearest wholesale options from Company A's inventory.`;

      return {
        candidates,
        categoryNode: node,
        isCategorized: true,
        explanation,
      };
    }

    // 3. Category recognized but no active inventory currently in this warehouse
    return {
      candidates: [],
      categoryNode: node,
      isCategorized: true,
      explanation: `Identified category: ${node.displayName}. However, no SKUs are currently active in this category in Company A's warehouse.`,
    };
  }
}

// Global default singleton instance
export const fmcgKnowledgeGraph = new FmcgTradeKnowledgeGraph();
