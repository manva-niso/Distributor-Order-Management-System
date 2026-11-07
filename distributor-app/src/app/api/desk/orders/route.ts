import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { hydrateOrdersFromNeon } from "@/db/neon-sync";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "ALL";
    const searchQuery = (searchParams.get("q") || "").toLowerCase().trim();

    // Hydrate orders from Neon to ensure desk view is synchronized
    await hydrateOrdersFromNeon();
    const allOrdersWithItems = dbStore.getAllOrders();

    // Attach retailer details to each order if not already populated
    const enrichedOrders = allOrdersWithItems.map(({ order, items }) => {
      const retailer = dbStore.getRetailerById(order.retailerId);
      return {
        ...order,
        retailerName: order.retailerName || retailer?.name || "Unknown Retailer",
        route: order.route || retailer?.route || "General Beat",
        retailerPhone: retailer?.phone,
        totalItemsCount: items.length,
        totalCasesCount: items.reduce((sum, item) => sum + item.quantityCases + item.freeCases, 0),
        items,
      };
    });

    // Apply filtering
    let filtered = enrichedOrders;
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(searchQuery) ||
          o.retailerName.toLowerCase().includes(searchQuery) ||
          (o.route && o.route.toLowerCase().includes(searchQuery))
      );
    }

    const stats = dbStore.getDeskStats();

    return NextResponse.json({
      success: true,
      orders: filtered,
      totalCount: filtered.length,
      stats,
    });
  } catch (err: any) {
    console.error("Desk orders list error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch desk orders" },
      { status: 500 }
    );
  }
}
