import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAndSendOtp } from "@/lib/auth/otp";

const SendOtpSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = SendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid input data",
        },
        { status: 400 }
      );
    }

    const { phone } = parseResult.data;
    const result = await createAndSendOtp(phone);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        expiresInSeconds: result.expiresInSeconds,
        devOtp: result.devOtp, // Returned only in dev / console mode for smooth testing
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("send-otp route error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error. Failed to process OTP request." },
      { status: 500 }
    );
  }
}
