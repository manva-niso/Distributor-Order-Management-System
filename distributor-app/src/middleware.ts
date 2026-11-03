import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isAuthRoute = pathname.startsWith("/login");
  const isDeskRoute = pathname.startsWith("/desk");
  const isProtectedRoute =
    pathname.startsWith("/catalogue") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/quick-order") ||
    pathname.startsWith("/capture");

  // Validate session if token present
  const session = token ? await verifySessionToken(token) : null;

  // 1. Authenticated user visiting /login -> redirect to appropriate home
  if (isAuthRoute && session) {
    const dest = session.role === "desk" ? "/desk" : "/catalogue";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // 2. Unauthenticated user visiting protected routes -> redirect to /login
  if ((isProtectedRoute || isDeskRoute) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Desk route protection: Only 'desk' role allowed
  if (isDeskRoute && session && session.role !== "desk") {
    // Non-desk user trying to access desk route -> bounce to catalogue
    return NextResponse.redirect(new URL("/catalogue", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/desk/:path*",
    "/catalogue/:path*",
    "/cart/:path*",
    "/orders/:path*",
    "/quick-order/:path*",
    "/capture/:path*",
  ],
};
