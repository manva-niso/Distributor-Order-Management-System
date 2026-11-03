import { SeedSku } from "@/db/seed-data";

export type UnitType = "CASE" | "PACK" | "KG" | "UNIT" | "UNKNOWN";

export type AmbiguityReason = "MISSING_UNIT" | "MULTIPLE_CANDIDATES" | "UNKNOWN_SKU" | null;

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
  confidence: number; // 0.0 to 1.0
  isAmbiguous: boolean;
  ambiguityReason: AmbiguityReason;
  candidates: SkuCandidate[];
  resolvedQtyCases: number;
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
}

/**
 * Standard Contract for Pluggable Order Parsing Engines
 * Allows drop-in replacement with custom Machine Learning microservices (e.g. spaCy, PyTorch, local FastAPI)
 */
export interface OrderParserPipeline {
  name: string;
  parseText(rawText: string, context?: ParserContext): Promise<ParseResult>;
}
