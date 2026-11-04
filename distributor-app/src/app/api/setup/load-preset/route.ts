import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { SEED_SKUS, SEED_RETAILERS } from "@/db/seed-data";
import { MASTER_CATALOG_SKUS, MASTER_RETAILERS, MASTER_USERS } from "@/db/master-data";
import { syncDatasetToNeon } from "@/db/neon-sync";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({ preset: "master" }));
    const preset = body.preset || "master";

    let label = "";

    if (preset === "master") {
      // 1. Full Master Enterprise Database (36 Wholesale FMCG SKUs)
      dbStore.loadMasterCatalog(true);
      label = "Master Wholesale FMCG Database (36 SKUs, 8 Kiranas, 4 Orders)";
    } else if (preset === "company_a" || preset === "default" || preset === "reset") {
      // 2. Company A Core Distribution (12 Baseline SKUs)
      dbStore.reset(true);
      label = "Company A Core FMCG (12 SKUs, 8 Kiranas, 4 Orders)";
    } else if (preset === "fmcg_food") {
      // 3. Grocery, Packaged Foods & Staples
      const foodSkus = MASTER_CATALOG_SKUS.filter(
        (s) =>
          s.category === "Biscuits & Confectionery" ||
          s.category === "Biscuits" ||
          s.category === "Tea, Coffee & Beverages" ||
          s.category === "Tea" ||
          s.category === "Edible Oils & Ghee" ||
          s.category === "Cooking Oil" ||
          s.category === "Packaged Foods & Spices" ||
          s.category === "Packaged Foods"
      );
      dbStore.importSkus(foodSkus, "replace");
      dbStore.importRetailers(MASTER_RETAILERS, "replace");
      label = `Grocery & Packaged Foods (${foodSkus.length} SKUs, 8 Kiranas)`;
    } else if (preset === "home_hygiene") {
      // 4. Home Care, Detergents & Cleaning
      const homeSkus = MASTER_CATALOG_SKUS.filter(
        (s) =>
          s.category === "Laundry & Detergents" ||
          s.category === "Detergent" ||
          s.category === "Personal Care & Toilet Soaps" ||
          s.category === "Personal Care" ||
          s.category === "Home Care & Cleaning"
      );
      dbStore.importSkus(homeSkus, "replace");
      dbStore.importRetailers(MASTER_RETAILERS, "replace");
      label = `Home Care & Detergents (${homeSkus.length} SKUs, 8 Kiranas)`;
    }

    // Synchronize to Neon PostgreSQL database
    const syncRes = await syncDatasetToNeon({
      skus: dbStore.getAllSkus(),
      retailers: dbStore.getAllRetailers(),
      users: dbStore.getAllUsers(),
      orders: dbStore.getAllOrders(),
      orderItemsMap: dbStore.getAllOrderItemsMap(),
      wipeFirst: true,
    });

    const storeStats = dbStore.getStoreStats();

    return NextResponse.json({
      success: true,
      preset,
      message: `${label} loaded into app successfully! ${syncRes.message}`,
      databaseSynced: syncRes.synced,
      stats: {
        ...storeStats,
        neonConnected: syncRes.synced,
      },
    });
  } catch (err: any) {
    console.error("Failed to load preset:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load preset." },
      { status: 500 }
    );
  }
}
