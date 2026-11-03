import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { buildTallyVoucherXml, formatTallyDate, TallyOrderEntry, validateTallyXml } from "@/lib/tally/xml-builder";
import { z } from "zod";

const ExportTallySchema = z.object({
  orderIds: z.array(z.string()).optional(),
  exportAllVerified: z.boolean().optional(),
  format: z.enum(["xml", "json"]).default("json"),
});

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const downloadParam = searchParams.get("download") === "true";

    const body = await request.json().catch(() => ({}));
    const parseResult = ExportTallySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { orderIds, exportAllVerified, format } = parseResult.data;

    // 1. Gather Candidate Orders
    const allOrdersWithItems = dbStore.getAllOrders();
    let targetEntries: TallyOrderEntry[] = [];

    if (orderIds && orderIds.length > 0) {
      for (const id of orderIds) {
        const found = dbStore.getOrderById(id);
        if (found) {
          const retailer = dbStore.getRetailerById(found.order.retailerId);
          if (retailer) {
            targetEntries.push({
              order: found.order,
              items: found.items,
              retailer,
            });
          }
        }
      }
    } else if (exportAllVerified || !orderIds) {
      for (const { order, items } of allOrdersWithItems) {
        if (order.status === "VERIFIED") {
          const retailer = dbStore.getRetailerById(order.retailerId);
          if (retailer) {
            targetEntries.push({ order, items, retailer });
          }
        }
      }
    }

    if (targetEntries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No eligible orders found to export. Please ensure orders are Confirmed (VERIFIED) before exporting.",
        },
        { status: 400 }
      );
    }

    // 2. Build Tally XML Batch
    const exportDate = new Date();
    const xmlString = buildTallyVoucherXml(targetEntries, {
      companyName: "Company A Jabalpur",
      exportDate,
    });

    // 3. Validate XML Structure
    const validation = validateTallyXml(xmlString);
    if (!validation.valid) {
      console.error("Tally XML validation failed:", validation.errors);
      return NextResponse.json(
        { success: false, error: "XML validation error", details: validation.errors },
        { status: 500 }
      );
    }

    // 4. Transition exported orders to EXPORTED_TALLY
    const exportedIds: string[] = [];
    for (const entry of targetEntries) {
      dbStore.updateOrderStatus(entry.order.id, "EXPORTED_TALLY");
      entry.order.tallyExportedAt = exportDate;
      exportedIds.push(entry.order.id);
    }

    const dateStr = formatTallyDate(exportDate);
    const filename = `tally-export-${dateStr}.xml`;

    // 5. Stream attachment or return JSON
    if (downloadParam || format === "xml") {
      return new NextResponse(xmlString, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: exportedIds.length,
      orderIds: exportedIds,
      filename,
      xmlPreview: xmlString.slice(0, 3000), // First ~3000 characters for modal preview
      fullXml: xmlString,
    });
  } catch (err: any) {
    console.error("Tally export route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to generate Tally export" },
      { status: 500 }
    );
  }
}
