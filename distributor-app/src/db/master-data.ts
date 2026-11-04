import masterCatalogRaw from "./master-catalog.json";
import { SeedSku, SEED_RETAILERS, SEED_USERS, SeedRetailer, SeedUser } from "./seed-data";

export const MASTER_CATALOG_SKUS: SeedSku[] = (masterCatalogRaw as any[]).map((s) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  brand: s.brand,
  category: s.category,
  packSize: s.packSize,
  unitsPerCase: s.unitsPerCase,
  dealerPrice: Number(s.dealerPrice),
  packPrice: Number(s.packPrice || 0),
  stockCases: Number(s.stockCases || 0),
  hsnCode: s.hsnCode,
  gstRate: Number(s.gstRate),
  schemeType: s.schemeType,
  schemeDetail: s.schemeDetail,
  active: s.active !== false,
}));

export const MASTER_RETAILERS: SeedRetailer[] = SEED_RETAILERS;
export const MASTER_USERS: SeedUser[] = SEED_USERS;
