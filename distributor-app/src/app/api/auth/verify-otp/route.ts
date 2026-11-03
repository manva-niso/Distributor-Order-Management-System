import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/auth/otp";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/jwt";

const VerifyOtpSchema = z.object({
  phone: z.string().min(10, "Phone number required"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
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

    const { phone, otp } = parseResult.data;
    const verifyResult = await verifyOtp(phone, otp);

    if (!verifyResult.success || !verifyResult.user) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || "Verification failed" },
        { status: 401 }
      );
    }

    const user = verifyResult.user;

    // Issue signed JWT token
    const token = await signSessionToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      retailerId: user.retailerId,
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
