import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { getNeonSql } from "@/db/neon";
import { syncDatasetToNeon } from "@/db/neon-sync";
import { broadcastDatabaseReset } from "@/lib/catalogue/inventory-events";

export async function POST(req: NextRequest) {
  try {
    let mode = "clean_slate";
    try {
      const body = await req.json();
      if (body && body.mode) {
        mode = body.mode;
      }
    } catch {
      // Body is optional
    }

    if (mode === "absolute_zero") {
      // 1. Wipe in-memory store completely to 0 SKUs, 0 Retailers, 0 Orders
      dbStore.resetToAbsoluteZero();

      // 2. Wipe Neon cloud database if connected
      const sql = getNeonSql();
      if (sql) {
        try {
          await sql`TRUNCATE TABLE order_items, orders, captures, capture_lines, retailer_aliases, skus, retailers, users CASCADE;`;
        } catch (neonErr) {
          console.warn("Neon truncate warning:", neonErr);
        }
      }

      // 3. Broadcast system-wide reset event to instantly purge all client carts and SSE streams
      broadcastDatabaseReset("absolute_zero");

      return NextResponse.json({
        success: true,
        mode: "absolute_zero",
        message: "Database wiped to Absolute Zero (0 SKUs, 0 Retailers, 0 Orders). Ready for fresh onboarding.",
        stats: {
          totalSkus: 0,
          totalRetailers: 0,
          totalOrders: 0,
        },
      });
    } else if (mode === "clean_slate") {
      // Pristine clean slate: 0 orders, baseline catalog & retailer balances
      dbStore.reset(false);

      // Sync to Neon
      const syncRes = await syncDatasetToNeon({
        skus: dbStore.getAllSkus(),
        retailers: dbStore.getAllRetailers(),
        users: dbStore.getAllUsers(),
        wipeFirst: true,
      });

      // Broadcast system-wide reset event to instantly purge all client carts and SSE streams
      broadcastDatabaseReset("clean_slate");

      return NextResponse.json({
        success: true,
        mode: "clean_slate",
        message: `Database wiped to pristine clean slate (0 orders, baseline stock & credit limits restored). ${syncRes.message}`,
        databaseSynced: syncRes.synced,
        stats: {
          totalSkus: dbStore.getAllSkus().length,
          totalRetailers: dbStore.getAllRetailers().length,
          totalOrders: dbStore.getAllOrders().length,
        },
      });
    } else {
      // Factory demo state with sample Jabalpur orders
      dbStore.reset(true);

      // Sync to Neon
      const syncRes = await syncDatasetToNeon({
        skus: dbStore.getAllSkus(),
        retailers: dbStore.getAllRetailers(),
        users: dbStore.getAllUsers(),
        orders: dbStore.getAllOrders(),
        orderItemsMap: dbStore.getAllOrderItemsMap(),
        wipeFirst: true,
      });

      // Broadcast system-wide reset event to instantly purge all client carts and SSE streams
      broadcastDatabaseReset("factory_demo");

      return NextResponse.json({
        success: true,
        mode: "factory_demo",
        message: `Database reset to factory Jabalpur demo state (sample orders, stock & credit). ${syncRes.message}`,
        databaseSynced: syncRes.synced,
        stats: {
          totalSkus: dbStore.getAllSkus().length,
          totalRetailers: dbStore.getAllRetailers().length,
          totalOrders: dbStore.getAllOrders().length,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to reset database",
      },
      { status: 500 }
    );
  }
}
