import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { releaseRetailerSession } from "@/lib/auth/session-lock";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const session = await verifySessionToken(token);
      if (session?.retailerId) {
        await releaseRetailerSession(session.retailerId, session.sessionId);
      }
    }
  } catch (err) {
    console.warn("Logout session release error:", err);
  }

  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
