import { NextRequest, NextResponse } from "next/server";
import { dbStore, StoredOrderItem } from "@/db/store";
import { syncOrderStatusToNeon, hydrateOrdersFromNeon } from "@/db/neon-sync";
import { calculateOrderSummary, InputLineItem } from "@/lib/schemes/engine";
import { z } from "zod";

const PatchOrderSchema = z.object({
  action: z.enum(["CONFIRM", "SAVE_CHANGES", "REJECT", "RELEASE_HOLD"]).default("SAVE_CHANGES"),
  expectedOccVersion: z.number().int().positive().optional(),
  occVersion: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        skuId: z.string().min(1),
        quantityCases: z.number().int().min(1),
      })
    )
    .optional(),
  lines: z
    .array(
      z.object({
        skuId: z.string().min(1),
        quantityCases: z.number().int().min(1),
      })
    )
    .optional(),
  newAliases: z
    .array(
      z.object({
        rawPhrase: z.string().min(1),
        skuId: z.string().min(1),
      })
    )
    .optional(),
  authorizedBy: z.string().optional(),
  approvalNote: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let orderData = dbStore.getOrderById(id);
    if (!orderData) {
      await hydrateOrdersFromNeon();
      orderData = dbStore.getOrderById(id);
    }

    if (!orderData) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const { order, items } = orderData;
    const retailer = dbStore.getRetailerById(order.retailerId);
    const allSkus = dbStore.getAllSkus();
    const aliases = dbStore.getRetailerAliases(order.retailerId);

    // Compute live available credit
    const availableCredit = retailer
      ? Math.max(0, retailer.creditLimit - retailer.currentBalance)
      : 0;

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        retailerName: order.retailerName || retailer?.name,
        route: order.route || retailer?.route,
      },
      retailer: retailer
        ? {
            ...retailer,
            availableCredit,
          }
        : null,
      items,
      catalogueSkus: allSkus,
      aliases,
    });
  } catch (err: any) {
    console.error("Fetch single desk order error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load order record" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = PatchOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const effectiveOcc = parsed.data.expectedOccVersion ?? parsed.data.occVersion;
    if (effectiveOcc === undefined) {
      return NextResponse.json(
        { success: false, error: "expectedOccVersion (or occVersion) is required for OCC validation" },
        { status: 400 }
      );
    }

    const { action, newAliases, authorizedBy, approvalNote } = parsed.data;
    const updatedItemsInput = parsed.data.items || parsed.data.lines || [];

    if (updatedItemsInput.length === 0 && action !== "REJECT") {
      return NextResponse.json(
        { success: false, error: "Order must contain at least one line item" },
        { status: 400 }
      );
    }

    let existing = dbStore.getOrderById(id);
    if (!existing) {
      await hydrateOrdersFromNeon();
      existing = dbStore.getOrderById(id);
    }
    if (!existing) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const { order: currentOrder } = existing;

    // 1. Concurrency Check (Rule [A19]: Reject if modified by another clerk)
    if (currentOrder.occVersion !== effectiveOcc) {
      return NextResponse.json(
        {
          success: false,
          conflict: true,
          error: `OCC Conflict: Order #${id} was modified by another clerk. Expected version ${effectiveOcc}, but current version is ${currentOrder.occVersion}. Please reload the record.`,
          currentVersion: currentOrder.occVersion,
        },
        { status: 409 }
      );
    }

    // 2. Handle Rejection / Cancellation
    if (action === "REJECT") {
      const result = dbStore.updateOrderStatus(id, "CANCELLED", effectiveOcc);
      syncOrderStatusToNeon(id, "CANCELLED", result.order?.occVersion || effectiveOcc + 1).catch((err) =>
        console.warn("Neon status sync warning:", err)
      );
      return NextResponse.json({
        success: true,
        order: result.order,
        message: `Order #${id} has been cancelled.`,
      });
    }

    // 3. Recalculate invoice & schemes through authoritative engine
    const engineInputs: InputLineItem[] = [];
    for (const itemInput of updatedItemsInput) {
      const sku = dbStore.getSkuById(itemInput.skuId);
      if (!sku) {
        return NextResponse.json(
          { success: false, error: `SKU '${itemInput.skuId}' not found in distributor master` },
          { status: 400 }
        );
      }

      engineInputs.push({
        skuId: sku.id,
        skuCode: sku.code,
        skuName: sku.name,
        orderedCases: itemInput.quantityCases,
        dealerPrice: sku.dealerPrice,
        gstRate: sku.gstRate,
        schemeType: sku.schemeType,
        schemeDetail: sku.schemeDetail,
      });
    }

    const summary = calculateOrderSummary(engineInputs);

    // Build refreshed StoredOrderItem array
    const storedItems: StoredOrderItem[] = summary.lines.map((calcLine, idx) => ({
      id: `item_${id}_${idx + 1}`,
      orderId: id,
      skuId: calcLine.skuId,
      skuCode: calcLine.skuCode,
      skuName: calcLine.skuName,
      quantityCases: calcLine.orderedCases,
      freeCases: calcLine.freeCases,
      unitDealerPrice: calcLine.dealerPrice,
      discountPct:
        calcLine.discountAmount > 0 && calcLine.grossAmount > 0
          ? Math.round((calcLine.discountAmount / calcLine.grossAmount) * 100)
          : 0,
      discountAmount: calcLine.discountAmount,
      netLineAmount: calcLine.taxableAmount,
      gstRate: calcLine.gstRate,
      gstAmount: calcLine.totalGstAmount,
    }));

    const freeGoodsTally = summary.lines
      .filter((l) => l.freeCases > 0)
      .map((l) => ({ skuId: l.skuId, skuName: l.skuName, freeCases: l.freeCases }));

    const totals = {
      subtotal: summary.totalGrossAmount,
      schemeDiscount: summary.totalDiscountAmount,
      taxableAmount: summary.totalTaxableAmount,
      totalGst: summary.totalGstAmount,
      grandTotal: summary.grandTotal,
      freeGoodsTally,
    };

    // Determine target status
    let nextStatus = currentOrder.status;
    if (action === "CONFIRM" || action === "RELEASE_HOLD") {
      nextStatus = "VERIFIED";
    }

    const updateResult = dbStore.updateOrderDetails(
      id,
      storedItems,
      totals,
      nextStatus,
      effectiveOcc
    );

    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult.error, conflict: updateResult.conflict },
        { status: updateResult.conflict ? 409 : 500 }
      );
    }

    // Handle Hold Release Notes
    if (action === "RELEASE_HOLD" && updateResult.order) {
      updateResult.order.holdReleasedBy = authorizedBy || "Sunil Clerk";
      updateResult.order.holdReleaseNote = approvalNote || "Hold approved by office desk";
    }

    // Sync status to Neon PostgreSQL
    syncOrderStatusToNeon(id, nextStatus, updateResult.order?.occVersion || effectiveOcc + 1).catch((err) =>
      console.warn("Neon status sync warning:", err)
    );

    // 4. Retailer Alias Auto-Learning (Rule [A20])
    // Whenever an office clerk corrects or associates a phrase with an SKU, persist it permanently
    const learnedAliases = [];
    if (newAliases && newAliases.length > 0) {
      for (const alias of newAliases) {
        if (alias.rawPhrase.trim()) {
          const saved = dbStore.saveRetailerAlias(
            currentOrder.retailerId,
            alias.rawPhrase,
            alias.skuId
          );
          learnedAliases.push(saved);
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: updateResult.order,
      items: updateResult.items,
      learnedAliases,
      summary,
    });
  } catch (err: any) {
    console.error("Update desk order error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update order" },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;
