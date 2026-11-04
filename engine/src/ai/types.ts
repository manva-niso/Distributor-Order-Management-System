import { SeedSku } from "../data/catalog";

export type UnitType = "CASE" | "PACK" | "KG" | "UNIT" | "DABBA" | "UNKNOWN";

export type AmbiguityReason =
  | "MISSING_UNIT"
  | "AMBIGUOUS_UNIT"
  | "MULTIPLE_CANDIDATES"
  | "UNKNOWN_SKU"
  | "BROKEN_CASE"
  | null;

export interface BrokenCaseInfo {
  requestedPacks: number;
  caseCapacity: number;
  fullCaseRoundUp: number;
  loosePackPrice: number;
  fullCasePrice: number;
}

export interface SkuCandidate {
  sku: SeedSku;
  score: number;
}

export interface ParsedLineItem {
  id: string;
  rawUtterance: string;
  extractedQty: number | null;
  extractedUnit: UnitType;
  matchedSku: SeedSku | null;
  confidence: number; // Calibrated 0.0 to 1.0 probability
  isAmbiguous: boolean;
  ambiguityReason: AmbiguityReason;
  candidates: SkuCandidate[];
  resolvedQtyCases: number;
  resolvedQtyPacks?: number;
  brokenCaseInfo?: BrokenCaseInfo | null;
}

export interface ParseResult {
  success: boolean;
  rawText: string;
  lines: ParsedLineItem[];
  totalLines: number;
  ambiguousCount: number;
  pipelineName: string;
}

export interface ParserContext {
  retailerId?: string;
  retailerPastOrders?: string[];
  retailerAliases?: Record<string, string>;
  availableSkus?: SeedSku[];
}

/**
 * Standard Contract for Pluggable Order Parsing Engines
 * Allows drop-in replacement with custom Machine Learning microservices (e.g. spaCy, PyTorch, local FastAPI)
 */
export interface OrderParserPipeline {
  name: string;
  parseText(rawText: string, context?: ParserContext): Promise<ParseResult>;
}
