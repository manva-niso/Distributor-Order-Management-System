import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore, StoredOrder, StoredOrderItem } from "@/db/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { calculateOrderSummary, InputLineItem } from "@/lib/schemes/engine";

const CheckoutItemSchema = z
  .object({
    skuId: z.string().min(1, "SKU ID required"),
    quantityCases: z.number().int().min(0).default(0),
    quantityPacks: z.number().int().min(0).default(0),
  })
  .refine((data) => (data.quantityCases || 0) > 0 || (data.quantityPacks || 0) > 0, {
    message: "Each line item must contain at least 1 case or 1 loose packet",
  });

const CheckoutSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1, "Cart cannot be empty"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication & Role
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) {
      return NextResponse.json(
        { success: false, error: "Authentication required to checkout" },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(cookie.value);
    if (!session || !session.retailerId) {
      return NextResponse.json(
        { success: false, error: "Only authorized retailers can place direct orders" },
        { status: 403 }
      );
    }

    const retailer = dbStore.getRetailerById(session.retailerId);
    if (!retailer) {
      return NextResponse.json(
        { success: false, error: "Retailer record not found" },
        { status: 404 }
      );
    }

    // 2. Validate Payload
    const body = await request.json();
    const parseResult = CheckoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid order payload",
        },
        { status: 400 }
      );
    }

    const { items: requestedItems } = parseResult.data;

    // 3. Validate Stock & Prepare Pricing Engine Input (Rule [A9])
    const engineInputs: InputLineItem[] = [];

    for (const req of requestedItems) {
      const sku = dbStore.getSkuById(req.skuId);
      if (!sku || !sku.active) {
        return NextResponse.json(
          { success: false, error: `SKU '${req.skuId}' is inactive or not found` },
          { status: 400 }
        );
      }

      const reqCases = req.quantityCases || 0;
      const reqPacks = req.quantityPacks || 0;
      const requiredEquivalentCases = reqCases + (reqPacks > 0 ? Math.ceil(reqPacks / sku.unitsPerCase) : 0);

      if (sku.stockCases < requiredEquivalentCases) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${sku.name}. Available: ${sku.stockCases} cases, requested: ${reqCases} cases${reqPacks > 0 ? ` + ${reqPacks} loose packs` : ""}.`,
          },
          { status: 400 }
        );
      }

      engineInputs.push({
        skuId: sku.id,
        skuCode: sku.code,
        skuName: sku.name,
        orderedCases: reqCases,
        orderedPacks: reqPacks,
        dealerPrice: sku.dealerPrice,
        packPrice: sku.packPrice,
        unitsPerCase: sku.unitsPerCase,
        gstRate: sku.gstRate,
        schemeType: sku.schemeType,
        schemeDetail: sku.schemeDetail,
      });
    }

    // 4. Calculate Complete Commercial Invoice via Pure Scheme Engine
    const summary = calculateOrderSummary(engineInputs);

    // 5. Verify physical warehouse stock covers both ordered and free promotional cases
    for (const line of summary.lines) {
      const sku = dbStore.getSkuById(line.skuId)!;
      const totalPhysicalCases = line.totalDeliveredCases + (line.totalDeliveredPacks > 0 ? 1 : 0);
      if (sku.stockCases < totalPhysicalCases) {
        return NextResponse.json(
          {
            success: false,
            error: `Warehouse stock (${sku.stockCases} cases) cannot cover ordered cases (${line.orderedCases}) + loose packs (${line.orderedPacks}) + promotional free cases (${line.freeCases}) for ${sku.name}.`,
          },
          { status: 400 }
        );
      }
    }

    // 6. Check Credit Exposure Ceiling (Rule [A14])
    const projectedBalance = retailer.currentBalance + summary.grandTotal;
    const creditExceeded = projectedBalance > retailer.creditLimit;
    const initialStatus: StoredOrder["status"] = creditExceeded ? "CREDIT_HOLD" : "PLACED";

    // 7. Deduct Warehouse Stock Atomically (Rule [A15])
    for (const line of summary.lines) {
      const casesToDeduct = line.totalDeliveredCases + (line.totalDeliveredPacks > 0 ? 1 : 0);
      dbStore.deductSkuStock(line.skuId, casesToDeduct);
    }

    // 8. Generate Order Record
    const allExistingOrders = dbStore.getAllOrders();
    const orderSeq = String(allExistingOrders.length + 1).padStart(4, "0");
    const orderId = `ORD-2026-${orderSeq}`;

    const freeGoodsTally = summary.lines
      .filter((l) => l.freeCases > 0)
      .map((l) => ({
        skuId: l.skuId,
        skuName: l.skuName,
        freeCases: l.freeCases,
      }));

    const orderRecord: StoredOrder = {
      id: orderId,
      retailerId: retailer.id,
      placedBy: session.userId,
      status: initialStatus,
      subtotal: summary.totalGrossAmount,
      schemeDiscount: summary.totalDiscountAmount,
      taxableAmount: summary.totalTaxableAmount,
      totalGst: summary.totalGstAmount,
      grandTotal: summary.grandTotal,
      freeGoodsTally,
      occVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderItemRecords: StoredOrderItem[] = summary.lines.map((l) => ({
      id: `item_${crypto.randomUUID().slice(0, 8)}`,
      orderId,
      skuId: l.skuId,
      skuName: l.skuName,
      skuCode: l.skuCode,
      quantityCases: l.orderedCases,
      quantityPacks: l.orderedPacks,
      freeCases: l.freeCases,
      unitDealerPrice: l.dealerPrice,
      unitPackPrice: l.packPrice,
      discountPct: l.discountAmount > 0 ? (l.discountAmount / l.grossAmount) * 100 : 0,
      discountAmount: l.discountAmount,
      netLineAmount: l.taxableAmount,
      gstRate: l.gstRate,
      gstAmount: l.totalGstAmount,
    }));

    // 9. Persist Order and update Retailer ledger
    dbStore.createOrder(orderRecord, orderItemRecords);

    return NextResponse.json(
      {
        success: true,
        message:
          initialStatus === "CREDIT_HOLD"
            ? "Order placed with Credit Hold alert. Awaiting desk clearance."
            : "Order confirmed successfully! Scheduled for van dispatch.",
        orderId,
        status: initialStatus,
        grandTotal: summary.grandTotal,
        totalDeliveredCases: summary.totalDeliveredCases,
        creditHold: creditExceeded,
        projectedBalance,
        creditLimit: retailer.creditLimit,
        redirectUrl: `/orders?placed=${orderId}`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Order checkout error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during order checkout." },
      { status: 500 }
    );
  }
}
