import { REAL_FMCG_CATALOG } from "./catalog-data";
import { RealFmcgSku, FmcgCategory } from "./types";

export * from "./types";
export * from "./catalog-data";

/**
 * FMCG Catalog Query & Inspection Utilities
 */
export class RealFmcgCatalogService {
  private catalog: RealFmcgSku[];
  private aliasMap: Map<string, RealFmcgSku>;

  constructor(skus: RealFmcgSku[] = REAL_FMCG_CATALOG) {
    this.catalog = skus;
    this.aliasMap = new Map();

    for (const sku of this.catalog) {
      for (const alias of sku.aliases) {
        this.aliasMap.set(alias.toLowerCase().trim(), sku);
      }
    }
  }

  public getAll(): RealFmcgSku[] {
    return this.catalog;
  }

  public getByCode(code: string): RealFmcgSku | undefined {
    return this.catalog.find((s) => s.code.toLowerCase() === code.toLowerCase());
  }

  public getById(id: string): RealFmcgSku | undefined {
    return this.catalog.find((s) => s.id === id);
  }

  public getByCategory(category: FmcgCategory): RealFmcgSku[] {
    return this.catalog.filter((s) => s.category === category);
  }

  public findByAlias(rawPhrase: string): RealFmcgSku | undefined {
    const clean = rawPhrase.toLowerCase().trim();
    return this.aliasMap.get(clean);
  }

  public getCategories(): FmcgCategory[] {
    return Array.from(new Set(this.catalog.map((s) => s.category)));
  }

  public getSummaryStats() {
    return {
      totalSkus: this.catalog.length,
      categoriesCount: this.getCategories().length,
      totalWarehouseCases: this.catalog.reduce((sum, s) => sum + s.stockCases, 0),
      totalWarehouseValue: this.catalog.reduce((sum, s) => sum + s.stockCases * s.dealerPrice, 0),
      schemesCount: this.catalog.filter((s) => s.schemeType !== "NONE").length,
    };
  }
}

/**
 * Builds a flat alias lookup dictionary (alias -> skuCode) for Tier 0 parser integration
 */
export function buildCatalogAliasMap(skus: RealFmcgSku[] = REAL_FMCG_CATALOG): Record<string, string> {
  const map: Record<string, string> = {};
  for (const sku of skus) {
    for (const alias of sku.aliases) {
      map[alias.toLowerCase().trim()] = sku.code;
    }
  }
  return map;
}

export const defaultCatalogService = new RealFmcgCatalogService();
