import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { SeedSku } from "@/db/seed-data";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const url = new URL(request.url);
    const queryRetailerId = url.searchParams.get("retailerId");

    let targetRetailerId = session?.retailerId;
    if (session?.role === "salesman" || session?.role === "desk") {
      targetRetailerId = queryRetailerId || session?.retailerId;
    }

    let retailer = undefined;
    if (targetRetailerId) {
      const r = dbStore.getRetailerById(targetRetailerId);
      if (r) {
        retailer = {
          id: r.id,
          name: r.name,
          ownerName: r.ownerName,
          creditLimit: r.creditLimit,
          currentBalance: r.currentBalance,
          availableCredit: r.creditLimit - r.currentBalance,
          creditHold: r.creditHold,
          route: r.route,
        };
      }
    }

    // If target retailer is not found in memory, query Neon directly if configured
    if (targetRetailerId && !retailer) {
      const sql = (await import("@/db/neon")).getNeonSql();
      if (sql) {
        try {
          const rows = (await sql`SELECT * FROM retailers WHERE id = ${targetRetailerId} LIMIT 1;`) as any[];
          if (rows && rows.length > 0) {
            const row = rows[0];
            const r = dbStore.createRetailer({
              id: row.id,
              name: row.name,
              ownerName: row.owner_name || row.ownerName || row.name,
              phone: row.phone,
              address: row.address,
              route: row.route,
              creditLimit: Number(row.credit_limit || row.creditLimit || 50000),
              currentBalance: Number(row.current_balance || row.currentBalance || 0),
              creditHold: Boolean(row.credit_hold || row.creditHold),
            });
            retailer = {
              id: r.id,
              name: r.name,
              ownerName: r.ownerName,
              creditLimit: r.creditLimit,
              currentBalance: r.currentBalance,
              availableCredit: r.creditLimit - r.currentBalance,
              creditHold: r.creditHold,
              route: r.route,
            };
          }
        } catch {}
      }
    }

    // Hydrate latest SKU stock from Neon if configured
    const { hydrateSkusFromNeon } = await import("@/db/neon-sync");
    await hydrateSkusFromNeon();

    const skus = dbStore.getAllSkus().filter((s) => s.active);

    const allRetailersList =
      session?.role === "salesman" || session?.role === "desk"
        ? dbStore.getAllRetailers().map((r) => ({
            id: r.id,
            name: r.name,
            ownerName: r.ownerName,
            route: r.route,
            creditLimit: r.creditLimit,
            currentBalance: r.currentBalance,
            availableCredit: r.creditLimit - r.currentBalance,
          }))
        : undefined;

    return NextResponse.json({
      success: true,
      userRole: session?.role || "retailer",
      userName: session?.name,
      retailer: retailer || null,
      allRetailers: allRetailersList,
      skus,
    });
  } catch (err) {
    console.error("Catalogue API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load catalogue inventory." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    // Only desk or authorized distributor users can mutate catalog items
    if (session && session.role !== "desk") {
      return NextResponse.json(
        { success: false, error: "Only Order Desk operators can edit the wholesale catalog." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, sku, skuId, stockDelta, newStock, newPrice } = body;

    if (action === "add_sku" && sku) {
      const id = sku.id || `SKU-${Date.now().toString().slice(-6)}`;
      const newSku: SeedSku = {
        id,
        code: sku.code || id,
        name: sku.name,
        brand: sku.brand || "General",
        category: sku.category || "General Grocery",
        packSize: sku.packSize || "Standard",
        unitsPerCase: Number(sku.unitsPerCase) || 24,
        dealerPrice: Number(sku.dealerPrice) || 100,
        packPrice: Number(sku.packPrice) || (Number(sku.dealerPrice) || 100) / (Number(sku.unitsPerCase) || 24),
        stockCases: Number(sku.stockCases) || 100,
        hsnCode: sku.hsnCode || "19053100",
        gstRate: Number(sku.gstRate) || 18,
        schemeType: sku.schemeType || "NONE",
        schemeDetail: sku.schemeDetail || {},
        active: true,
      };

      dbStore.importSkus([newSku], "merge");

      return NextResponse.json({
        success: true,
        message: `Product '${newSku.name}' added to catalog!`,
        sku: newSku,
        totalSkus: dbStore.getAllSkus().length,
      });
    }

    if (action === "update_stock" && skuId) {
      const existing = dbStore.getSkuById(skuId);
      if (!existing) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }

      if (newStock !== undefined) {
        existing.stockCases = Math.max(0, Number(newStock));
      } else if (stockDelta !== undefined) {
        existing.stockCases = Math.max(0, existing.stockCases + Number(stockDelta));
      }

      if (newPrice !== undefined && Number(newPrice) > 0) {
        existing.dealerPrice = Number(newPrice);
        existing.packPrice = Number(newPrice) / (existing.unitsPerCase || 24);
      }

      dbStore.importSkus([existing], "merge");

      // Sync stock update to Neon PostgreSQL
      const sql = (await import("@/db/neon")).getNeonSql();
      if (sql) {
        try {
          await sql`UPDATE skus SET stock_cases = ${existing.stockCases} WHERE id = ${existing.id};`;
        } catch (neonErr) {
          console.warn("Neon SKU stock update warning:", neonErr);
        }
      }

      const { broadcastStockUpdate } = await import("@/lib/catalogue/inventory-events");
      broadcastStockUpdate();

      return NextResponse.json({
        success: true,
        message: `Updated stock for '${existing.name}' to ${existing.stockCases} cases.`,
        sku: existing,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Catalogue mutation error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update catalog" },
      { status: 500 }
    );
  }
}
