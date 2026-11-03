import { NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { buildTallyVoucherXml, TallyOrderEntry, validateTallyXml } from "@/lib/tally/xml-builder";

export async function GET() {
  try {
    const allOrdersWithItems = dbStore.getAllOrders();
    const verifiedEntries: TallyOrderEntry[] = [];

    for (const { order, items } of allOrdersWithItems) {
      if (order.status === "VERIFIED") {
        const retailer = dbStore.getRetailerById(order.retailerId);
        if (retailer) {
          verifiedEntries.push({ order, items, retailer });
        }
      }
    }

    if (verifiedEntries.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        orders: [],
        message: "No verified orders waiting for Tally export.",
      });
    }

    const xmlString = buildTallyVoucherXml(verifiedEntries);
    const validation = validateTallyXml(xmlString);

    return NextResponse.json({
      success: true,
      count: verifiedEntries.length,
      orders: verifiedEntries.map((e) => ({
        id: e.order.id,
        retailerName: e.retailer.name,
        route: e.retailer.route,
        grandTotal: e.order.grandTotal,
        itemsCount: e.items.length,
      })),
      xmlPreview: xmlString.slice(0, 3500),
      fullXml: xmlString,
      isValidXml: validation.valid,
    });
  } catch (err: any) {
    console.error("Tally preview route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to generate Tally preview" },
      { status: 500 }
    );
  }
}
