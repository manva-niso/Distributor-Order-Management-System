import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp, consumeOtp } from "@/lib/auth/otp";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/jwt";
import { acquireRetailerSession, forceReleaseRetailerSession } from "@/lib/auth/session-lock";

const VerifyOtpSchema = z
  .object({
    phone: z.string().min(10, "Phone number required"),
    otp: z.string().length(6, "OTP must be exactly 6 digits").optional(),
    code: z.string().length(6, "OTP must be exactly 6 digits").optional(),
    force: z.boolean().optional(),
  })
  .refine((data) => data.otp || data.code, {
    message: "OTP must be exactly 6 digits",
    path: ["otp"],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = VerifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid input data",
        },
        { status: 400 }
      );
    }

    const { phone, otp, code, force } = parseResult.data;
    const effectiveOtp = (otp || code)!;
    // Verify without immediately consuming, so concurrency conflict doesn't burn the OTP
    const verifyResult = await verifyOtp(phone, effectiveOtp, { consume: false });

    if (!verifyResult.success || !verifyResult.user) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || "Verification failed" },
        { status: 401 }
      );
    }

    const user = verifyResult.user;
    let sessionId: string | undefined;

    // Concurrency Lock: If multiple users access as the same Kirana store, block access
    if (user.role === "retailer" && user.retailerId) {
      if (force) {
        await forceReleaseRetailerSession(user.retailerId, user.phone);
      }
      const lock = await acquireRetailerSession(user.retailerId, user.id, user.phone, Boolean(force));
      if (!lock.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "User already logged in",
            code: "USER_ALREADY_LOGGED_IN",
            activeSince: lock.activeSince,
          },
          { status: 409 }
        );
      }
      sessionId = lock.sessionId;
    }

    // Mark OTP as consumed now that session is successfully granted
    await consumeOtp(verifyResult.otpId);

    // Issue signed JWT token
    const token = await signSessionToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      retailerId: user.retailerId,
      sessionId,
    });

    // Determine target redirect path based on user role
    const redirectUrl = user.role === "desk" ? "/desk" : "/catalogue";

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user,
        redirectUrl,
      },
      { status: 200 }
    );

    // Set HTTP-Only Cookie
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
    console.error("verify-otp route error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during verification." },
      { status: 500 }
    );
  }
}
