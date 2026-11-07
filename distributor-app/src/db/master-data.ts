import masterCatalogRaw from "./master-catalog.json";
import { SeedSku, SEED_RETAILERS, SEED_USERS, SeedRetailer, SeedUser } from "./seed-data";
import {
  SKU_HINDI_MAP,
  BRAND_HINDI_MAP,
  CATEGORY_HINDI_MAP,
  RETAILER_HINDI_MAP,
  ROUTE_HINDI_MAP,
} from "@/lib/i18n/trade-dict";

export const MASTER_CATALOG_SKUS: SeedSku[] = (masterCatalogRaw as any[]).map((s) => {
  const codeKey = s.code || s.id;
  const mapped = SKU_HINDI_MAP[codeKey] || SKU_HINDI_MAP[s.id];

  return {
    id: s.id,
    code: s.code,
    name: s.name,
    nameHi: s.nameHi || s.name_hi || mapped?.nameHi || s.name,
    brand: s.brand,
    brandHi: s.brandHi || s.brand_hi || mapped?.brandHi || (s.brand ? BRAND_HINDI_MAP[s.brand] || s.brand : ""),
    category: s.category,
    categoryHi: s.categoryHi || s.category_hi || mapped?.categoryHi || (s.category ? CATEGORY_HINDI_MAP[s.category] || s.category : ""),
    packSize: s.packSize,
    packSizeHi: s.packSizeHi || s.packSize_hi || mapped?.packSizeHi,
    unitsPerCase: s.unitsPerCase,
    dealerPrice: Number(s.dealerPrice),
    packPrice: Number(s.packPrice || 0),
    stockCases: Number(s.stockCases || 0),
    hsnCode: s.hsnCode,
    gstRate: Number(s.gstRate),
    schemeType: s.schemeType,
    schemeDetail: s.schemeDetail,
    active: s.active !== false,
  };
});

export const MASTER_RETAILERS: SeedRetailer[] = SEED_RETAILERS.map((r) => {
  const mapped = RETAILER_HINDI_MAP[r.id];
  return {
    ...r,
    nameHi: r.nameHi || mapped?.nameHi || r.name,
    ownerNameHi: r.ownerNameHi || mapped?.ownerNameHi || r.ownerName,
    routeHi: r.routeHi || (r.route ? ROUTE_HINDI_MAP[r.route] || r.route : ""),
  };
});

export const MASTER_USERS: SeedUser[] = SEED_USERS;
