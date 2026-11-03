import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    let retailer = undefined;
    if (session?.retailerId) {
      const r = dbStore.getRetailerById(session.retailerId);
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

    const skus = dbStore.getAllSkus().filter((s) => s.active);

    return NextResponse.json({
      success: true,
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
