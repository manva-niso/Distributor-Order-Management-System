import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { getNeonSql } from "@/db/neon";

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
          await sql`TRUNCATE TABLE orders, order_items, captures, capture_lines, retailer_aliases, retailers, skus CASCADE;`;
        } catch (neonErr) {
          console.warn("Neon truncate warning:", neonErr);
        }
      }

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
      return NextResponse.json({
        success: true,
        mode: "clean_slate",
        message: "Database wiped to pristine clean slate (0 orders, baseline stock & credit limits restored).",
        stats: {
          totalSkus: dbStore.getAllSkus().length,
          totalRetailers: dbStore.getAllRetailers().length,
          totalOrders: dbStore.getAllOrders().length,
        },
      });
    } else {
      // Factory demo state with the 3 sample Jabalpur orders
      dbStore.reset(true);
      return NextResponse.json({
        success: true,
        mode: "factory_demo",
        message: "Database reset to factory Jabalpur demo state (sample orders, stock & credit).",
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
