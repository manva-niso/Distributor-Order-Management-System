import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { buildTallyVoucherXml, TallyOrderEntry, validateTallyXml } from "@/lib/tally/xml-builder";

function generatePreview(orderIds?: string[]) {
  const allOrdersWithItems = dbStore.getAllOrders();
  const entries: TallyOrderEntry[] = [];

  if (orderIds && orderIds.length > 0) {
    for (const id of orderIds) {
      const found = dbStore.getOrderById(id);
      if (found) {
        const retailer = dbStore.getRetailerById(found.order.retailerId);
        if (retailer) {
          entries.push({ order: found.order, items: found.items, retailer });
        }
      }
    }
  } else {
    for (const { order, items } of allOrdersWithItems) {
      if (order.status === "VERIFIED" || order.status === "PLACED") {
        const retailer = dbStore.getRetailerById(order.retailerId);
        if (retailer) {
          entries.push({ order, items, retailer });
        }
      }
    }
  }

  if (entries.length === 0) {
    return {
      success: true,
      count: 0,
      orders: [],
      message: "No orders waiting for Tally export.",
      xmlPreview: "",
      fullXml: "",
      isValidXml: true,
    };
  }

  const xmlString = buildTallyVoucherXml(entries);
  const validation = validateTallyXml(xmlString);

  return {
    success: true,
    count: entries.length,
    orders: entries.map((e) => ({
      id: e.order.id,
      retailerName: e.retailer.name,
      route: e.retailer.route,
      grandTotal: e.order.grandTotal,
      itemsCount: e.items.length,
      status: e.order.status,
    })),
    xmlPreview: xmlString.slice(0, 3500),
    fullXml: xmlString,
    isValidXml: validation.valid,
  };
}

export async function GET() {
  try {
    const result = generatePreview();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Tally preview route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to generate Tally preview" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderIds = Array.isArray(body?.orderIds) ? body.orderIds : undefined;
    const result = generatePreview(orderIds);
    return NextResponse.json({
      ...result,
      preview: {
        vouchers: result.orders,
        xmlSnippet: result.xmlPreview,
        fullXml: result.fullXml,
      },
    });
  } catch (err: any) {
    console.error("Tally preview route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to generate Tally preview" },
      { status: 500 }
    );
  }
}
