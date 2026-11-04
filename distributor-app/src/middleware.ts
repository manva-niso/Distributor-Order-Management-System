import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isAuthRoute = pathname.startsWith("/login");
  const isDeskRoute = pathname.startsWith("/desk");
  const isSetupRoute = pathname.startsWith("/setup");
  const isPortalRoute =
    pathname.startsWith("/catalogue") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/quick-order") ||
    pathname.startsWith("/capture");

  // Validate session if token present
  const session = token ? await verifySessionToken(token) : null;

  // 1. Authenticated user visiting /login -> redirect to their designated seat
  if (isAuthRoute && session) {
    const dest = session.role === "desk" ? "/desk" : "/catalogue";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // 2. Unauthenticated user visiting protected routes -> redirect to /login
  // Note: /setup is open for unauthenticated users for first-time onboarding & database initialization
  if ((isPortalRoute || isDeskRoute) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. STRICT SEAT ISOLATION ("Whatever seat you are in, you must remain in that seat"):
  // Seat A: Desk Operator (role === 'desk')
  // - Authorized seats: /desk, /setup, and /catalogue (for viewing, filling & managing wholesale catalog)
  // - If desk clerk attempts to enter customer buyer checkout routes (/quick-order, /cart, /orders),
  //   keep them strictly in their Order Desk workstation seat.
  const isCustomerBuyerRoute =
    pathname.startsWith("/cart") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/quick-order") ||
    pathname.startsWith("/capture");

  if (isCustomerBuyerRoute && session?.role === "desk") {
    return NextResponse.redirect(new URL("/desk", request.url));
  }

  // Seat B & C: Kirana Retailer (role === 'retailer') & Salesman Beat (role === 'salesman')
  // - Authorized seat: Kirana Portal (/catalogue, /quick-order, /cart, /orders)
  // - If a retailer or salesman attempts to enter /desk or /setup,
  //   keep them strictly in their Kirana buyer seat.
  if ((isDeskRoute || isSetupRoute) && session && session.role !== "desk") {
    return NextResponse.redirect(new URL("/catalogue", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/desk/:path*",
    "/setup/:path*",
    "/catalogue/:path*",
    "/cart/:path*",
    "/orders/:path*",
    "/quick-order/:path*",
    "/capture/:path*",
  ],
};
