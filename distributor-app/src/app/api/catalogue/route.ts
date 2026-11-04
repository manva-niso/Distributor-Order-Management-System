import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const url = new URL(request.url);
    const queryRetailerId = url.searchParams.get("retailerId");

    let targetRetailerId = session?.retailerId;
    if (session?.role === "salesman" || session?.role === "desk") {
      targetRetailerId = queryRetailerId || session?.retailerId;
    }

    let retailer = undefined;
    if (targetRetailerId) {
      const r = dbStore.getRetailerById(targetRetailerId);
      if (r) {
        retailer = {
          id: r.id,
          name: r.name,
          ownerName: r.ownerName,
          creditLimit: r.creditLimit,
          currentBalance: r.currentBalance,
          availableCredit: r.creditLimit - r.currentBalance,
          creditHold: r.creditHold,
          route: r.route,
        };
      }
    }

    // Fallback if no target retailer found
    if (!retailer) {
      const allR = dbStore.getAllRetailers();
      if (allR.length > 0) {
        const first = allR[0];
        retailer = {
          id: first.id,
          name: first.name,
          ownerName: first.ownerName,
          creditLimit: first.creditLimit,
          currentBalance: first.currentBalance,
          availableCredit: first.creditLimit - first.currentBalance,
          creditHold: first.creditHold,
          route: first.route,
        };
      }
    }

    const skus = dbStore.getAllSkus().filter((s) => s.active);

    const allRetailersList =
      session?.role === "salesman" || session?.role === "desk"
        ? dbStore.getAllRetailers().map((r) => ({
            id: r.id,
            name: r.name,
            ownerName: r.ownerName,
            route: r.route,
            creditLimit: r.creditLimit,
            currentBalance: r.currentBalance,
            availableCredit: r.creditLimit - r.currentBalance,
          }))
        : undefined;

    return NextResponse.json({
      success: true,
      userRole: session?.role || "retailer",
      userName: session?.name,
      retailer: retailer || {
        id: "RET-0001",
        name: "Sharma Kirana Store",
        ownerName: "Ramesh Sharma",
        creditLimit: 50000,
        currentBalance: 12000,
        availableCredit: 38000,
        creditHold: false,
        route: "Napier Town Route #4",
      },
      allRetailers: allRetailersList,
      skus,
    });
  } catch (err) {
    console.error("Catalogue API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load catalogue inventory." },
      { status: 500 }
    );
  }
}
