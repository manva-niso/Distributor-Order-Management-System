import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { dbStore } from "@/db/store";
import { touchRetailerSession } from "@/lib/auth/session-lock";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = dbStore.getUserById(payload.userId) || {
    id: payload.userId,
    phone: payload.phone,
    name: payload.name,
    role: payload.role,
    retailerId: payload.retailerId,
  };

  let retailer = undefined;
  if (user.retailerId) {
    // Touch active session to refresh lastActiveAt timestamp
    touchRetailerSession(user.retailerId, payload.sessionId).catch(() => {});

    const r = dbStore.getRetailerById(user.retailerId);
    if (r) {
      retailer = {
        id: r.id,
        name: r.name,
        ownerName: r.ownerName,
        phone: r.phone,
        address: r.address,
        route: r.route,
        creditLimit: r.creditLimit,
        currentBalance: r.currentBalance,
        availableCredit: r.creditLimit - r.currentBalance,
        creditHold: r.creditHold,
      };
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      retailerId: user.retailerId,
    },
    retailer,
  });
}
