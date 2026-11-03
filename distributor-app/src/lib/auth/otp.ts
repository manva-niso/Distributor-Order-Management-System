import { dbStore, StoredOtp } from "@/db/store";
import crypto from "crypto";

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
  devOtp?: string; // Provided only when running in dev without SMS API credentials
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    phone: string;
    name: string;
    role: "retailer" | "salesman" | "desk";
    retailerId?: string;
  };
}

/**
 * Generates a cryptographically random 6-digit numeric OTP
 */
export function generateNumericOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Dispatches an SMS via Fast2SMS / Twilio or outputs to server console
 */
async function dispatchSms(phone: string, otpCode: string): Promise<{ success: boolean; provider: string }> {
  const provider = process.env.SMS_PROVIDER || "console";
  const apiKey = process.env.SMS_API_KEY;

  // Real Fast2SMS Gateway Dispatch
  if (provider === "fast2sms" && apiKey) {
    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otpCode,
          numbers: phone,
        }),
      });

      if (!response.ok) {
        console.error(`Fast2SMS failed with status: ${response.status}`);
        return { success: false, provider: "fast2sms" };
      }
      return { success: true, provider: "fast2sms" };
    } catch (err) {
      console.error("Fast2SMS network dispatch error:", err);
      return { success: false, provider: "fast2sms" };
    }
  }

  // Real Twilio Gateway Dispatch
  if (provider === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const params = new URLSearchParams();
      params.append("To", `+91${phone}`);
      params.append("From", fromNumber || "");
      params.append("Body", `Company A Jabalpur: Your login verification OTP is ${otpCode}. Valid for 5 minutes.`);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        console.error(`Twilio failed with status: ${response.status}`);
        return { success: false, provider: "twilio" };
      }
      return { success: true, provider: "twilio" };
    } catch (err) {
      console.error("Twilio network dispatch error:", err);
      return { success: false, provider: "twilio" };
    }
  }

  // Developer & Demo Console Logging (zero-fail fallback)
  console.log("=================================================");
  console.log(`[SMS OTP DISPATCH] Phone: +91 ${phone}`);
  console.log(`[SMS OTP DISPATCH] Verification OTP: >>> ${otpCode} <<<`);
  console.log(`[SMS OTP DISPATCH] Message: Company A Jabalpur: Your login code is ${otpCode}`);
  console.log("=================================================");

  return { success: true, provider: "console" };
}

/**
 * Creates, stores, and dispatches a 6-digit OTP for a phone number
 */
export async function createAndSendOtp(rawPhone: string): Promise<SendOtpResult> {
  const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

  if (cleanPhone.length !== 10) {
    return { success: false, message: "Please provide a valid 10-digit Indian mobile number." };
  }

  // Rate Limiting: Check if an active OTP was issued within the last 30 seconds
  const existingOtp = dbStore.getLatestActiveOtp(cleanPhone);
  if (existingOtp) {
    const elapsedSeconds = (Date.now() - existingOtp.createdAt.getTime()) / 1000;
    if (elapsedSeconds < 30) {
      return {
        success: false,
        message: `Please wait ${Math.ceil(30 - elapsedSeconds)} seconds before requesting a new OTP.`,
      };
    }
  }

  const otpCode = generateNumericOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  const storedOtp: StoredOtp = {
    id: "otp_" + crypto.randomUUID(),
    phone: cleanPhone,
    otpCode,
    expiresAt,
    attempts: 0,
    verified: false,
    createdAt: new Date(),
  };

  dbStore.saveOtp(storedOtp);

  // Dispatch via configured SMS gateway or local console
  const smsResult = await dispatchSms(cleanPhone, otpCode);

  const isDevOrConsole = !process.env.SMS_API_KEY || smsResult.provider === "console";

  return {
    success: true,
    message: `OTP sent successfully to +91 ${cleanPhone.slice(0, 2)}****${cleanPhone.slice(-4)}.`,
    expiresInSeconds: 300,
    devOtp: isDevOrConsole ? otpCode : undefined,
  };
}

/**
 * Verifies the submitted OTP against stored active records
 */
export async function verifyOtp(rawPhone: string, inputOtp: string): Promise<VerifyOtpResult> {
  const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
  const cleanCode = inputOtp.trim();

  if (cleanPhone.length !== 10) {
    return { success: false, error: "Invalid mobile number." };
  }

  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: "OTP must be a 6-digit numeric code." };
  }

  const activeOtp = dbStore.getLatestActiveOtp(cleanPhone);

  if (!activeOtp) {
    return {
      success: false,
      error: "No active OTP request found for this number. Please click 'Send OTP'.",
    };
  }

  // Expiry Guard
  if (Date.now() > activeOtp.expiresAt.getTime()) {
    return {
      success: false,
      error: "This OTP has expired. Please request a new code.",
    };
  }

  // Attempt Guard (Max 3 failed attempts)
  if (activeOtp.attempts >= 3) {
    dbStore.markOtpVerified(activeOtp.id); // Invalidate burnt OTP
    return {
      success: false,
      error: "Too many incorrect attempts. For security, please request a new OTP.",
    };
  }

  // Constant-time comparison to prevent timing side-channel attacks
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(activeOtp.otpCode.padEnd(6, " ")),
    Buffer.from(cleanCode.padEnd(6, " "))
  );

  if (!isMatch) {
    const attempts = dbStore.incrementOtpAttempts(activeOtp.id);
    const remaining = 3 - attempts;
    return {
      success: false,
      error: `Incorrect OTP. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : "Please request a new code."}`,
    };
  }

  // Mark as successfully verified
  dbStore.markOtpVerified(activeOtp.id);

  // Look up user or auto-provision registered retailer
  let user = dbStore.getUserByPhone(cleanPhone);

  if (!user) {
    // Check if phone matches pre-registered retailer
    const retailer = dbStore.getRetailerByPhone(cleanPhone);
    if (retailer) {
      user = dbStore.createUser({
        id: "usr_" + crypto.randomUUID().slice(0, 8),
        phone: cleanPhone,
        name: retailer.ownerName,
        role: "retailer",
        retailerId: retailer.id,
        active: true,
      });
    } else {
      // Auto-register as guest retailer in sandbox
      user = dbStore.createUser({
        id: "usr_" + crypto.randomUUID().slice(0, 8),
        phone: cleanPhone,
        name: `Kirana Partner (${cleanPhone.slice(-4)})`,
        role: "retailer",
        retailerId: "RET-0001", // Linked to primary demo retailer
        active: true,
      });
    }
  }

  return {
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      retailerId: user.retailerId,
    },
  };
}
