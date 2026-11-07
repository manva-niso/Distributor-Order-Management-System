import { NextRequest, NextResponse } from "next/server";
import { parseWorkbookBuffer } from "@/lib/excel/importer";
import { dbStore } from "@/db/store";
import { syncDatasetToNeon } from "@/db/neon-sync";
import { broadcastCatalogSync } from "@/lib/catalogue/inventory-events";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let buffer: Buffer | null = null;
    let mode: "replace" | "merge" = "merge";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const rawMode = formData.get("mode") as string | null;
      if (rawMode === "replace") mode = "replace";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "Please upload an Excel (.xlsx/.xls) or CSV file." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      if (body.mode === "replace") mode = "replace";

      if (body.skus && Array.isArray(body.skus)) {
        dbStore.importSkus(body.skus, mode);
      }
      if (body.retailers && Array.isArray(body.retailers)) {
        dbStore.importRetailers(body.retailers, mode);
      }

      return NextResponse.json({
        success: true,
        message: "Master data updated successfully.",
        stats: dbStore.getStoreStats(),
      });
    }

    if (!buffer) {
      return NextResponse.json(
        { success: false, error: "No valid file buffer received." },
        { status: 400 }
      );
    }

    // Parse Excel workbook
    const parseResult = parseWorkbookBuffer(buffer);

    if (!parseResult.success && parseResult.skus.length === 0 && parseResult.retailers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not parse valid items or retailers from the uploaded sheet.",
          errors: parseResult.errors,
        },
        { status: 422 }
      );
    }

    // Ingest into active MemoryStore
    if (parseResult.skus.length > 0) {
      dbStore.importSkus(parseResult.skus, mode);
      broadcastCatalogSync();
    }

    if (parseResult.retailers.length > 0) {
      dbStore.importRetailers(parseResult.retailers, mode);
    } else {
      // Catalog-only upload: ensure baseline retailers exist so kiranas can order
      dbStore.getAllRetailers();
    }

    // Synchronize newly imported catalog to Neon PostgreSQL
    let dbSyncMsg = "";
    try {
      const syncRes = await syncDatasetToNeon({
        skus: dbStore.getAllSkus(),
        retailers: dbStore.getAllRetailers(),
        users: dbStore.getAllUsers(),
        wipeFirst: mode === "replace" && parseResult.retailers.length > 0,
      });
      if (syncRes.synced) dbSyncMsg = " " + syncRes.message;
    } catch (syncErr) {
      console.warn("Neon sync warning during excel import:", syncErr);
    }

    const stats = dbStore.getStoreStats();

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${parseResult.skus.length} SKU(s) and ${parseResult.retailers.length} Retailer account(s)!${dbSyncMsg}`,
      summary: parseResult.summary,
      stats,
      warnings: parseResult.errors,
    });
  } catch (err: any) {
    console.error("Excel import API error:", err);
    return NextResponse.json(
      { success: false, error: `Import failed: ${err?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
