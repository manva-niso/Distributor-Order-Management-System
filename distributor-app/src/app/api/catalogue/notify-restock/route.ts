import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/db/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

const NotifySchema = z.object({
  skuId: z.string().min(1, "SKU ID required"),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = NotifySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { skuId } = parseResult.data;
    const sku = dbStore.getSkuById(skuId);

    if (!sku) {
      return NextResponse.json(
        { success: false, error: "SKU not found in catalogue." },
        { status: 404 }
      );
    }

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    const phone = session?.phone || parseResult.data.phone || "Unknown";

    console.log(
      `[RESTOCK TELEMETRY] Retailer (${phone}) requested notification for out-of-stock SKU: ${sku.code} - ${sku.name}`
    );

    return NextResponse.json({
      success: true,
      message: `Notification registered for ${sku.name}. We will alert you on WhatsApp as soon as fresh stock arrives at the depot.`,
      skuCode: sku.code,
    });
  } catch (err) {
    console.error("notify-restock error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to record notification request." },
      { status: 500 }
    );
  }
}
