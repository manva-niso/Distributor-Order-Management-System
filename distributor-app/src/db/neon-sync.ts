import { getNeonDb, getNeonSql, isNeonConfigured } from "./neon";
import * as schema from "./schema";
import { SeedSku, SeedRetailer, SeedUser } from "./seed-data";
import { StoredOrder, StoredOrderItem } from "./store";

export interface SyncResult {
  synced: boolean;
  message: string;
  skusCount?: number;
  retailersCount?: number;
  usersCount?: number;
  ordersCount?: number;
  error?: string;
}

function toNumStr(val: any, fallback: string = "0.00"): string {
  if (val == null || isNaN(Number(val))) return fallback;
  return Number(val).toString();
}

/**
 * Sync entire catalog & master dataset to Neon PostgreSQL
 */
export async function syncDatasetToNeon(params: {
  skus: SeedSku[];
  retailers: SeedRetailer[];
  users: SeedUser[];
  orders?: StoredOrder[] | Array<{ order: StoredOrder; items: StoredOrderItem[] }>;
  orderItemsMap?: Map<string, StoredOrderItem[]> | Record<string, StoredOrderItem[]>;
  wipeFirst?: boolean;
}): Promise<SyncResult> {
  if (!isNeonConfigured()) {
    return {
      synced: false,
      message: "Neon DATABASE_URL is not configured. Running in in-memory mode.",
    };
  }

  const db = getNeonDb();
  const sql = getNeonSql();
  if (!db || !sql) {
    return {
      synced: false,
      message: "Failed to initialize Neon client.",
    };
  }

  try {
    // 1. Wipe old records if requested
    if (params.wipeFirst) {
      if (params.retailers.length > 0) {
        try {
          await sql`TRUNCATE TABLE order_items, orders, captures, capture_lines, retailer_aliases, skus, retailers, users CASCADE;`;
        } catch (truncErr) {
          // Fallback delete if truncate encounters permission locks
          await sql`DELETE FROM order_items;`;
          await sql`DELETE FROM orders;`;
          await sql`DELETE FROM retailer_aliases;`;
          await sql`DELETE FROM skus;`;
          await sql`DELETE FROM retailers;`;
          await sql`DELETE FROM users;`;
        }
      } else {
        try {
          await sql`DELETE FROM order_items;`;
          await sql`DELETE FROM skus;`;
        } catch {}
      }
    }

    // 2. Insert Retailers
    for (const r of params.retailers) {
      await db
        .insert(schema.retailers)
        .values({
          id: r.id,
          name: r.name,
          ownerName: r.ownerName,
          phone: r.phone,
          address: r.address,
          route: r.route,
          salesmanId: r.salesmanId,
          creditLimit: toNumStr(r.creditLimit, "50000"),
          currentBalance: toNumStr(r.currentBalance, "0"),
          creditHold: Boolean(r.creditHold),
          lastOrderAt: r.lastOrderAt || new Date(),
        })
        .onConflictDoUpdate({
          target: schema.retailers.id,
          set: {
            name: r.name,
            ownerName: r.ownerName,
            phone: r.phone,
            address: r.address,
            route: r.route,
            creditLimit: toNumStr(r.creditLimit, "50000"),
            currentBalance: toNumStr(r.currentBalance, "0"),
            creditHold: Boolean(r.creditHold),
          },
        });
    }

    // 3. Insert Users
    for (const u of params.users) {
      await db
        .insert(schema.users)
        .values({
          id: u.id,
          phone: u.phone,
          name: u.name,
          role: u.role,
          retailerId: u.retailerId,
          active: Boolean(u.active),
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: {
            name: u.name,
            phone: u.phone,
            role: u.role,
            retailerId: u.retailerId,
            active: Boolean(u.active),
          },
        });
    }

    // 4. Insert SKUs
    for (const s of params.skus) {
      await db
        .insert(schema.skus)
        .values({
          id: s.id,
          code: s.code,
          name: s.name,
          brand: s.brand,
          category: s.category,
          packSize: s.packSize,
          unitsPerCase: s.unitsPerCase || 1,
          dealerPrice: toNumStr(s.dealerPrice, "0"),
          packPrice: toNumStr(s.packPrice, "0"),
          stockCases: s.stockCases || 0,
          hsnCode: s.hsnCode || "19053100",
          gstRate: toNumStr(s.gstRate, "18"),
          schemeType: s.schemeType || "NONE",
          schemeDetail: (s.schemeDetail as any) || {},
          active: s.active !== false,
        })
        .onConflictDoUpdate({
          target: schema.skus.id,
          set: {
            code: s.code,
            name: s.name,
            brand: s.brand,
            category: s.category,
            packSize: s.packSize,
            unitsPerCase: s.unitsPerCase || 1,
            dealerPrice: toNumStr(s.dealerPrice, "0"),
            packPrice: toNumStr(s.packPrice, "0"),
            stockCases: s.stockCases || 0,
            hsnCode: s.hsnCode || "19053100",
            gstRate: toNumStr(s.gstRate, "18"),
            schemeType: s.schemeType || "NONE",
            schemeDetail: (s.schemeDetail as any) || {},
            active: s.active !== false,
          },
        });
    }

    // 5. Insert Orders if present
    let ordersCount = 0;
    if (params.orders && params.orders.length > 0) {
      for (const entry of params.orders) {
        const ord: StoredOrder = (entry as any).order ?? entry;
        if (!ord || !ord.id) continue;

        await db
          .insert(schema.orders)
          .values({
            id: ord.id,
            retailerId: ord.retailerId,
            placedBy: ord.placedBy,
            status: ord.status,
            subtotal: toNumStr(ord.subtotal, "0"),
            schemeDiscount: toNumStr(ord.schemeDiscount, "0"),
            taxableAmount: toNumStr(ord.taxableAmount, "0"),
            totalGst: toNumStr(ord.totalGst, "0"),
            grandTotal: toNumStr(ord.grandTotal, "0"),
            freeGoodsTally: (ord.freeGoodsTally as any) || [],
            occVersion: ord.occVersion || 1,
            createdAt: ord.createdAt || new Date(),
            updatedAt: ord.updatedAt || new Date(),
          })
          .onConflictDoUpdate({
            target: schema.orders.id,
            set: {
              status: ord.status,
              grandTotal: toNumStr(ord.grandTotal, "0"),
              occVersion: ord.occVersion || 1,
              updatedAt: ord.updatedAt || new Date(),
            },
          });
        ordersCount++;

        // Insert Order Items
        const entryItems = (entry as any).items as StoredOrderItem[] | undefined;
        const items =
          entryItems && entryItems.length > 0
            ? entryItems
            : params.orderItemsMap instanceof Map
            ? params.orderItemsMap.get(ord.id)
            : params.orderItemsMap
            ? (params.orderItemsMap as Record<string, StoredOrderItem[]>)[ord.id]
            : null;

        if (items && items.length > 0) {
          for (const it of items) {
            await db
              .insert(schema.orderItems)
              .values({
                id: it.id,
                orderId: it.orderId || ord.id,
                skuId: it.skuId,
                skuName: it.skuName,
                skuCode: it.skuCode,
                quantityCases: it.quantityCases || 0,
                quantityPacks: it.quantityPacks || 0,
                freeCases: it.freeCases || 0,
                unitDealerPrice: toNumStr(it.unitDealerPrice, "0"),
                unitPackPrice: toNumStr(it.unitPackPrice, "0"),
                discountPct: toNumStr(it.discountPct, "0"),
                discountAmount: toNumStr(it.discountAmount, "0"),
                netLineAmount: toNumStr(it.netLineAmount, "0"),
                gstRate: toNumStr(it.gstRate, "18"),
                gstAmount: toNumStr(it.gstAmount, "0"),
              })
              .onConflictDoNothing();
          }
        }
      }
    }

    return {
      synced: true,
      message: `Successfully synchronized ${params.skus.length} SKUs, ${params.retailers.length} Retailers, and ${ordersCount} Orders to Neon PostgreSQL!`,
      skusCount: params.skus.length,
      retailersCount: params.retailers.length,
      usersCount: params.users.length,
      ordersCount,
    };
  } catch (err: any) {
    console.error("Neon database synchronization failed:", err);
    return {
      synced: false,
      message: "Database sync encountered an error: " + (err?.message || "Unknown error"),
      error: err?.message,
    };
  }
}

/**
 * Sync a newly placed order to Neon PostgreSQL
 */
export async function syncSingleOrderToNeon(order: StoredOrder, items: StoredOrderItem[]): Promise<boolean> {
  if (!isNeonConfigured()) return false;
  const db = getNeonDb();
  if (!db) return false;

  try {
    await db
      .insert(schema.orders)
      .values({
        id: order.id,
        retailerId: order.retailerId,
        placedBy: order.placedBy,
        status: order.status,
        subtotal: toNumStr(order.subtotal, "0"),
        schemeDiscount: toNumStr(order.schemeDiscount, "0"),
        taxableAmount: toNumStr(order.taxableAmount, "0"),
        totalGst: toNumStr(order.totalGst, "0"),
        grandTotal: toNumStr(order.grandTotal, "0"),
        freeGoodsTally: (order.freeGoodsTally as any) || [],
        occVersion: order.occVersion || 1,
        createdAt: order.createdAt || new Date(),
        updatedAt: order.updatedAt || new Date(),
      })
      .onConflictDoUpdate({
        target: schema.orders.id,
        set: {
          status: order.status,
          grandTotal: toNumStr(order.grandTotal, "0"),
          occVersion: order.occVersion || 1,
          updatedAt: order.updatedAt || new Date(),
        },
      });

    for (const it of items) {
      await db
        .insert(schema.orderItems)
        .values({
          id: it.id,
          orderId: it.orderId,
          skuId: it.skuId,
          skuName: it.skuName,
          skuCode: it.skuCode,
          quantityCases: it.quantityCases || 0,
          quantityPacks: it.quantityPacks || 0,
          freeCases: it.freeCases || 0,
          unitDealerPrice: toNumStr(it.unitDealerPrice, "0"),
          unitPackPrice: toNumStr(it.unitPackPrice, "0"),
          discountPct: toNumStr(it.discountPct, "0"),
          discountAmount: toNumStr(it.discountAmount, "0"),
          netLineAmount: toNumStr(it.netLineAmount, "0"),
          gstRate: toNumStr(it.gstRate, "18"),
          gstAmount: toNumStr(it.gstAmount, "0"),
        })
        .onConflictDoNothing();
    }

    // Update retailer ledger and live balance in Neon PostgreSQL
    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`UPDATE retailers SET current_balance = current_balance + ${toNumStr(order.grandTotal, "0")}, last_order_at = NOW() WHERE id = ${order.retailerId};`;
        for (const it of items) {
          const totalCases = (it.quantityCases || 0) + (it.freeCases || 0);
          if (totalCases > 0) {
            await sql`UPDATE skus SET stock_cases = GREATEST(0, stock_cases - ${totalCases}) WHERE id = ${it.skuId};`;
          }
        }
      } catch (ledgerErr) {
        console.warn("Neon ledger update warning:", ledgerErr);
      }
    }

    return true;
  } catch (err) {
    console.error("Failed to sync single order to Neon:", err);
    return false;
  }
}

/**
 * Sync status update (e.g. order approval / credit release) to Neon PostgreSQL
 */
export async function syncOrderStatusToNeon(orderId: string, status: any, occVersion: number): Promise<boolean> {
  if (!isNeonConfigured()) return false;
  const sql = getNeonSql();
  if (!sql) return false;

  try {
    await sql`UPDATE orders SET status = ${status}, occ_version = ${occVersion}, updated_at = NOW() WHERE id = ${orderId};`;
    return true;
  } catch (err) {
    console.error("Failed to update order status in Neon:", err);
    return false;
  }
}

/**
 * Hydrate orders and line items from Neon PostgreSQL into the in-memory store
 * Prevents previously placed orders from disappearing when re-logging in or restarting.
 */
export async function hydrateOrdersFromNeon(
  retailerId?: string
): Promise<Array<{ order: StoredOrder; items: StoredOrderItem[] }>> {
  if (!isNeonConfigured()) return [];
  const sql = getNeonSql();
  if (!sql) return [];

  try {
    const orderRows = (retailerId
      ? await sql`SELECT * FROM orders WHERE retailer_id = ${retailerId} ORDER BY created_at DESC;`
      : await sql`SELECT * FROM orders ORDER BY created_at DESC;`) as any[];

    if (!orderRows || orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map((r: any) => r.id);
    let itemRows: any[] = [];
    if (orderIds.length > 0) {
      try {
        itemRows = (await sql`SELECT * FROM order_items WHERE order_id = ANY(${orderIds}::varchar[]);`) as any[];
      } catch {
        try {
          itemRows = (await sql`SELECT * FROM order_items;`) as any[];
        } catch {
          itemRows = [];
        }
      }
    }

    // Group items by orderId
    const itemsByOrder = new Map<string, StoredOrderItem[]>();
    for (const it of itemRows) {
      const mappedItem: StoredOrderItem = {
        id: it.id,
        orderId: it.order_id || it.orderId,
        skuId: it.sku_id || it.skuId,
        skuName: it.sku_name || it.skuName || "",
        skuCode: it.sku_code || it.skuCode || "",
        quantityCases: Number(it.quantity_cases || it.quantityCases || 0),
        quantityPacks: Number(it.quantity_packs || it.quantityPacks || 0),
        freeCases: Number(it.free_cases || it.freeCases || 0),
        unitDealerPrice: Number(it.unit_dealer_price || it.unitDealerPrice || 0),
        unitPackPrice: Number(it.unit_pack_price || it.unitPackPrice || 0),
        discountPct: Number(it.discount_pct || it.discountPct || 0),
        discountAmount: Number(it.discount_amount || it.discountAmount || 0),
        netLineAmount: Number(it.net_line_amount || it.netLineAmount || 0),
        gstRate: Number(it.gst_rate || it.gstRate || 18),
        gstAmount: Number(it.gst_amount || it.gstAmount || 0),
      };
      if (!itemsByOrder.has(mappedItem.orderId)) {
        itemsByOrder.set(mappedItem.orderId, []);
      }
      itemsByOrder.get(mappedItem.orderId)!.push(mappedItem);
    }

    const { dbStore } = await import("./store");
    const hydrated: Array<{ order: StoredOrder; items: StoredOrderItem[] }> = [];

    for (const row of orderRows) {
      const items = itemsByOrder.get(row.id) || [];
      const orderRecord: StoredOrder = {
        id: row.id,
        retailerId: row.retailer_id || row.retailerId,
        placedBy: row.placed_by || row.placedBy || "Kirana Store",
        status: row.status || "PLACED",
        subtotal: Number(row.subtotal || 0),
        schemeDiscount: Number(row.scheme_discount || row.schemeDiscount || 0),
        taxableAmount: Number(row.taxable_amount || row.taxableAmount || 0),
        totalGst: Number(row.total_gst || row.totalGst || 0),
        grandTotal: Number(row.grand_total || row.grandTotal || 0),
        freeGoodsTally: row.free_goods_tally || row.freeGoodsTally || [],
        occVersion: Number(row.occ_version || row.occVersion || 1),
        tallyExportedAt: row.tally_exported_at ? new Date(row.tally_exported_at) : undefined,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      };

      // Upsert into memory store without double-charging credit ledger
      dbStore.upsertOrder(orderRecord, items);
      hydrated.push({ order: orderRecord, items });
    }

    return hydrated;
  } catch (err) {
    console.warn("Neon order hydration warning:", err);
    return [];
  }
}

/**
 * Hydrate SKU stock levels from Neon PostgreSQL into in-memory store
 * Guarantees cross-instance stock synchronization.
 */
export async function hydrateSkusFromNeon(): Promise<number> {
  if (!isNeonConfigured()) return 0;
  const sql = getNeonSql();
  if (!sql) return 0;

  try {
    const rows = (await sql`SELECT id, stock_cases, active FROM skus;`) as any[];
    if (!rows || rows.length === 0) return 0;

    const { dbStore } = await import("./store");
    let updatedCount = 0;
    for (const row of rows) {
      const sku = dbStore.getSkuById(row.id);
      if (sku) {
        const neonStock = Number(row.stock_cases ?? row.stockCases ?? 0);
        if (sku.stockCases !== neonStock) {
          sku.stockCases = neonStock;
          updatedCount++;
        }
        if (row.active !== undefined) {
          sku.active = Boolean(row.active);
        }
      }
    }
    return updatedCount;
  } catch (err) {
    console.warn("Neon SKU hydration warning:", err);
    return 0;
  }
}

