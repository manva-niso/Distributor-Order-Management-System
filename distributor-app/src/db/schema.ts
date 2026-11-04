import { pgTable, text, varchar, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ==========================================
// SCHEMA A: User Input, Inflow & Auth
// ==========================================

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["retailer", "salesman", "desk"] }).notNull().default("retailer"),
  retailerId: varchar("retailer_id", { length: 36 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otps = pgTable("otps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull(),
  otpCode: varchar("otp_code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const captures = pgTable("captures", {
  id: varchar("id", { length: 36 }).primaryKey(),
  retailerId: varchar("retailer_id", { length: 36 }).notNull(),
  source: text("source", { enum: ["text", "image", "audio"] }).notNull().default("text"),
  rawPayload: text("raw_payload").notNull(),
  mediaUrl: text("media_url"),
  status: text("status", { enum: ["PENDING_REVIEW", "CONFIRMED", "DISCARDED"] }).notNull().default("PENDING_REVIEW"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const captureLines = pgTable("capture_lines", {
  id: varchar("id", { length: 36 }).primaryKey(),
  captureId: varchar("capture_id", { length: 36 }).notNull(),
  rawUtterance: text("raw_utterance").notNull(),
  mappedSkuId: varchar("mapped_sku_id", { length: 36 }),
  quantity: integer("quantity").notNull(),
  unit: text("unit", { enum: ["CASE", "PIECE"] }).notNull().default("CASE"),
  confidence: numeric("confidence", { precision: 4, scale: 2 }).notNull(),
  alternatives: jsonb("alternatives").$type<Array<{ skuId: string; skuName: string; confidence: number }>>(),
  isAmbiguous: boolean("is_ambiguous").notNull().default(false),
  disambiguationQuestion: text("disambiguation_question"),
  resolved: boolean("resolved").notNull().default(true),
});

// ==========================================
// SCHEMA B: Distributor Master, Ledger & Orders
// ==========================================

export const retailers = pgTable("retailers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  address: text("address").notNull(),
  route: text("route").notNull(),
  salesmanId: varchar("salesman_id", { length: 36 }),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).notNull().default("50000.00"),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  creditHold: boolean("credit_hold").notNull().default(false),
  lastOrderAt: timestamp("last_order_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const skus = pgTable("skus", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category").notNull(),
  packSize: text("pack_size").notNull(),
  unitsPerCase: integer("units_per_case").notNull(),
  dealerPrice: numeric("dealer_price", { precision: 10, scale: 2 }).notNull(),
  packPrice: numeric("pack_price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  stockCases: integer("stock_cases").notNull().default(0),
  hsnCode: varchar("hsn_code", { length: 20 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18.00"),
  schemeType: text("scheme_type", { enum: ["NONE", "FREE_GOODS", "SLAB_DISCOUNT", "FLAT_REBATE"] }).notNull().default("NONE"),
  schemeDetail: jsonb("scheme_detail").$type<{
    buyQty?: number;
    getFreeQty?: number;
    freeSkuId?: string;
    freeSkuName?: string;
    minCases?: number;
    discountPct?: number;
    tiers?: Array<{ minCases: number; discountPct: number }>;
    flatPerCase?: number;
    minCasesForRebate?: number;
  }>(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const retailerAliases = pgTable("retailer_aliases", {
  id: varchar("id", { length: 36 }).primaryKey(),
  retailerId: varchar("retailer_id", { length: 36 }).notNull(),
  rawPhrase: text("raw_phrase").notNull(),
  skuId: varchar("sku_id", { length: 36 }).notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 2 }).notNull().default("1.00"),
  timesUsed: integer("times_used").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  retailerId: varchar("retailer_id", { length: 36 }).notNull(),
  placedBy: varchar("placed_by", { length: 36 }).notNull(),
  status: text("status", { enum: ["PLACED", "VERIFIED", "CREDIT_HOLD", "EXPORTED_TALLY", "CANCELLED"] })
    .notNull()
    .default("PLACED"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  schemeDiscount: numeric("scheme_discount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull(),
  totalGst: numeric("total_gst", { precision: 12, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  freeGoodsTally: jsonb("free_goods_tally").$type<Array<{ skuId: string; skuName: string; freeCases: number }>>(),
  tallyExportedAt: timestamp("tally_exported_at"),
  occVersion: integer("occ_version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 }).notNull(),
  skuId: varchar("sku_id", { length: 36 }).notNull(),
  skuName: text("sku_name"),
  skuCode: varchar("sku_code", { length: 50 }),
  quantityCases: integer("quantity_cases").notNull(),
  quantityPacks: integer("quantity_packs").notNull().default(0),
  freeCases: integer("free_cases").notNull().default(0),
  unitDealerPrice: numeric("unit_dealer_price", { precision: 10, scale: 2 }).notNull(),
  unitPackPrice: numeric("unit_pack_price", { precision: 10, scale: 2 }).default("0.00"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  netLineAmount: numeric("net_line_amount", { precision: 12, scale: 2 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
  gstAmount: numeric("gst_amount", { precision: 10, scale: 2 }).notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
