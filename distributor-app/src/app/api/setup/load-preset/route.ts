import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { SEED_SKUS, SEED_RETAILERS } from "@/db/seed-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({ preset: "default" }));
    const preset = body.preset || "default";

    if (preset === "reset" || preset === "default") {
      dbStore.reset();
    } else if (preset === "fmcg_food") {
      // Filter primarily Food & Biscuits
      const foodSkus = SEED_SKUS.filter((s) => s.category === "Biscuits" || s.category === "Tea" || s.category === "Cooking Oil" || s.category === "Packaged Foods");
      dbStore.importSkus(foodSkus, "replace");
      dbStore.importRetailers(SEED_RETAILERS, "replace");
    } else if (preset === "home_hygiene") {
      // Filter Detergents & Personal Care
      const homeSkus = SEED_SKUS.filter((s) => s.category === "Detergent" || s.category === "Personal Care");
      dbStore.importSkus(homeSkus, "replace");
      dbStore.importRetailers(SEED_RETAILERS, "replace");
    }

    return NextResponse.json({
      success: true,
      message: `Preset '${preset}' applied successfully.`,
      stats: dbStore.getStoreStats(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load preset." },
      { status: 500 }
    );
  }
}
