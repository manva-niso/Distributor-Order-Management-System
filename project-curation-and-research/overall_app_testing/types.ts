export type FmcgCategory =
  | "Biscuits & Confectionery"
  | "Tea, Coffee & Beverages"
  | "Edible Oils & Ghee"
  | "Laundry & Detergents"
  | "Personal Care & Toilet Soaps"
  | "Packaged Foods & Noodles"
  | "Home Care & Cleaning";

export type SchemeType = "NONE" | "FREE_GOODS" | "SLAB_DISCOUNT" | "FLAT_REBATE";

export interface SlabTier {
  minCases: number;
  discountPct: number;
}

export interface SchemeDetail {
  buyQty?: number;
  getFreeQty?: number;
  freeSkuId?: string;
  freeSkuName?: string;
  minCases?: number;
  discountPct?: number;
  tiers?: SlabTier[];
  flatPerCase?: number;
  minCasesForRebate?: number;
}

export interface PackagingHierarchy {
  unitsPerInnerBox?: number; // Counter display box / shrink pack
  unitsPerCase: number; // Master corrugated wholesale shipper (peti)
  masterCaseWeightKg?: number; // Total gross case weight for van payload calculations
  isPolysemicDabbaUnit?: boolean; // True for oil tins and display boxes prone to "dabba" confusion
}

export interface RealFmcgSku {
  id: string;
  code: string;
  name: string;
  brand: string;
  manufacturer: string;
  category: FmcgCategory;
  packSize: string;
  packaging: PackagingHierarchy;
  unitsPerCase: number;
  mrp: number; // Maximum Retail Price printed on consumer pack
  packPrice: number; // Loose single pack dealer price ex-tax
  dealerPrice: number; // Full case wholesale price ex-tax
  stockCases: number;
  hsnCode: string;
  gstRate: number; // 0%, 5%, 12%, 18%
  schemeType: SchemeType;
  schemeDetail?: SchemeDetail;
  aliases: string[]; // Vernacular aliases, Hinglish shorthand, and Devanagari trade names
  active: boolean;
}

export interface RealisticOrderItem {
  utterance: string;
  expectedSkuCode: string | null; // null if out-of-catalog or noise
  expectedQuantity: number | null;
  expectedUnit: "CASE" | "PACK" | "DABBA" | "UNKNOWN";
  expectedDecision: "AUTO_CONFIRM" | "DISAMBIGUATION" | "ESCALATE_CHOOSER";
  expectedAmbiguityReason?: "MISSING_UNIT" | "AMBIGUOUS_UNIT" | "BROKEN_CASE" | "MULTIPLE_CANDIDATES" | "UNKNOWN_SKU" | null;
  categoryTag: "vernacular_slang" | "voice_transcription" | "broken_case" | "dabba_polysemy" | "multi_item_order" | "hindi_script" | "out_of_catalog";
}

export interface RealisticOrderScenario {
  id: string;
  sourceType: "WHATSAPP_TEXT" | "PHONE_CALL_TRANSCRIPT" | "SMS" | "PAPER_SLIP";
  retailerName: string;
  retailerRoute: string;
  rawMessage: string;
  items: RealisticOrderItem[];
  notes?: string;
}
