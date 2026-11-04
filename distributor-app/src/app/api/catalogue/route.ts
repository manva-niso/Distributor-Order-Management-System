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

    // Fallback if no target retailer found
    if (!retailer) {
      const allR = dbStore.getAllRetailers();
      if (allR.length > 0) {
        const first = allR[0];
        retailer = {
          id: first.id,
          name: first.name,
          ownerName: first.ownerName,
          creditLimit: first.creditLimit,
          currentBalance: first.currentBalance,
          availableCredit: first.creditLimit - first.currentBalance,
          creditHold: first.creditHold,
          route: first.route,
        };
      }
    }

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
      retailer: retailer || {
        id: "RET-0001",
        name: "Sharma Kirana Store",
        ownerName: "Ramesh Sharma",
        creditLimit: 50000,
        currentBalance: 12000,
        availableCredit: 38000,
        creditHold: false,
        route: "Napier Town Route #4",
      },
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
