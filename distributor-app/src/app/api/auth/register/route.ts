import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/db/store";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/jwt";

const RegisterSchema = z
  .object({
    phone: z.string().min(10, "Valid 10-digit phone number is required").regex(/^\d{10}$/, "Must be 10 digits"),
    shopName: z.string().min(3, "Shop name must be at least 3 characters").optional(),
    name: z.string().min(3, "Shop name must be at least 3 characters").optional(),
    ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
    route: z.string().min(2, "Please select your delivery route/beat"),
    address: z.string().min(5, "Shop address in Jabalpur is required"),
    gstin: z.string().optional(),
  })
  .refine((data) => data.shopName || data.name, {
    message: "Shop name must be at least 3 characters",
    path: ["shopName"],
  });

export const AVAILABLE_ROUTES = [
  "Napier Town Route #4",
  "Wright Town Route #2",
  "Gorakhpur Route #1",
  "Adhartal Route #3",
  "Garha Route #5",
  "Cantt & Sadar Route #6",
  "Vijay Nagar Route #7",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = RegisterSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid registration details.",
        },
        { status: 400 }
      );
    }

    const { phone, shopName, name, ownerName, route, address } = parseResult.data;
    const effectiveShopName = (shopName || name || "").trim();
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    // Guard: Prevent duplicate registrations
    const existingRetailer = dbStore.getRetailerByPhone(cleanPhone);
    const existingUser = dbStore.getUserByPhone(cleanPhone);

    if (existingRetailer || existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "This phone number is already registered. Please proceed to Login directly.",
        },
        { status: 409 }
      );
    }

    // Allocate sequential Retailer ID beyond the 1,800 pre-seeded kirana base
    const allRetailers = dbStore.getAllRetailers();
    const nextSeq = 1800 + allRetailers.length + 1;
    const retailerId = `RET-${nextSeq}`;

    // Create Retailer record with provisional credit limit of ₹25,000 (Assumption [A5])
    const { ROUTE_HINDI_MAP } = await import("@/lib/i18n/trade-dict");
    const { transliterateToHindi } = await import("@/lib/i18n/transliterate");
    const routeHi = ROUTE_HINDI_MAP[route.trim()] || transliterateToHindi(route.trim());
    const nameHi = transliterateToHindi(effectiveShopName);
    const ownerNameHi = transliterateToHindi(ownerName.trim());

    const newRetailer = dbStore.createRetailer({
      id: retailerId,
      name: effectiveShopName,
      nameHi,
      ownerName: ownerName.trim(),
      ownerNameHi,
      phone: cleanPhone,
      address: address.trim(),
      route: route.trim(),
      routeHi,
      creditLimit: 25000,
      currentBalance: 0,
      creditHold: false,
      lastOrderAt: undefined,
    });

    // Create User record linked to the retailer
    const newUser = dbStore.createUser({
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      phone: cleanPhone,
      name: ownerName.trim(),
      role: "retailer",
      retailerId: newRetailer.id,
      active: true,
    });

    // Sign 7-day cryptographic JWT session
    const token = await signSessionToken({
      userId: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      role: newUser.role,
      retailerId: newUser.retailerId,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Kirana shop successfully registered! Welcome to Company A Distribution.",
        retailer: newRetailer,
        redirectUrl: "/catalogue",
      },
      { status: 201 }
    );

    // Set secure HTTP-Only session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    console.error("Register route error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
