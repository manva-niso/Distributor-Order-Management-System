import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { hydrateOrdersFromNeon } from "@/db/neon-sync";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(cookie.value);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    let ordersWithItems;

    if (session.role === "retailer") {
      if (!session.retailerId) {
        return NextResponse.json({ success: true, orders: [] });
      }
      // Hydrate orders from Neon so orders never disappear upon relogin or server restart
      await hydrateOrdersFromNeon(session.retailerId);
      ordersWithItems = dbStore.getOrdersByRetailerId(session.retailerId);
    } else {
      await hydrateOrdersFromNeon();
      ordersWithItems = dbStore.getAllOrders();
    }

    // Enrich with retailer metadata for display
    const enriched = ordersWithItems.map(({ order, items }) => {
      const retailer = dbStore.getRetailerById(order.retailerId);
      return {
        ...order,
        retailerName: retailer?.name || "Unknown Retailer",
        retailerRoute: retailer?.route || "Unassigned Route",
        retailerPhone: retailer?.phone || "",
        items,
      };
    });

    return NextResponse.json({
      success: true,
      orders: enriched,
    });
  } catch (err) {
    console.error("Orders list error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load orders" },
      { status: 500 }
    );
  }
}
