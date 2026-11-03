import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawPhone = searchParams.get("phone") || "";
  const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

  if (cleanPhone.length !== 10) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  const user = dbStore.getUserByPhone(cleanPhone);
  const retailer = dbStore.getRetailerByPhone(cleanPhone);

  if (user && user.role === "desk") {
    return NextResponse.json({
      found: true,
      role: "desk",
      title: "Company A Order Desk",
      subtitle: user.name,
    });
  }

  if (user && user.role === "salesman") {
    return NextResponse.json({
      found: true,
      role: "salesman",
      title: "Field Sales Representative",
      subtitle: user.name,
    });
  }

  if (retailer) {
    return NextResponse.json({
      found: true,
      role: "retailer",
      title: retailer.name,
      subtitle: `${retailer.id} • ${retailer.route}`,
      availableCredit: retailer.creditLimit - retailer.currentBalance,
    });
  }

  return NextResponse.json({ found: false }, { status: 200 });
}
