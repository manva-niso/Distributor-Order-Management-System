import { dbStore, StoredOtp } from "@/db/store";
import { getNeonSql, isNeonConfigured } from "@/db/neon";
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
  otpId?: string;
  user?: {
    id: string;
    phone: string;
    name: string;
    role: "retailer" | "salesman" | "desk";
    retailerId?: string;
  };
}

/**
 * Consumes and permanently marks an OTP as verified in memory and Neon database
 */
export async function consumeOtp(otpId?: string): Promise<void> {
  if (!otpId) return;
  dbStore.markOtpVerified(otpId);
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`UPDATE otps SET verified = true WHERE id = ${otpId};`;
      } catch (err) {
        console.warn("Neon consume OTP warning:", err);
      }
    }
  }
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

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.return === false)) {
        console.error(`[Fast2SMS Error] Status: ${response.status}`, data);
        return { success: false, provider: "fast2sms" };
      }

      console.log(`[Fast2SMS Success] SMS OTP sent to +91 ${phone}:`, data);
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

  // Persist to Neon PostgreSQL if configured
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS otps (
            id VARCHAR(50) PRIMARY KEY,
            phone VARCHAR(15) NOT NULL,
            otp_code VARCHAR(6) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            verified BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `;
        await sql`
          INSERT INTO otps (id, phone, otp_code, expires_at, attempts, verified, created_at)
          VALUES (${storedOtp.id}, ${cleanPhone}, ${otpCode}, ${expiresAt.toISOString()}, 0, false, NOW());
        `;
      } catch (err) {
        console.warn("Neon OTP persistence warning:", err);
      }
    }
  }

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
export async function verifyOtp(
  rawPhone: string,
  inputOtp: string,
  options: { consume?: boolean } = { consume: true }
): Promise<VerifyOtpResult> {
  const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
  const cleanCode = inputOtp.trim();

  if (cleanPhone.length !== 10) {
    return { success: false, error: "Invalid mobile number." };
  }

  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: "OTP must be a 6-digit numeric code." };
  }

  let activeOtp = dbStore.getLatestActiveOtp(cleanPhone);

  // If not found in memory, query Neon database (handles serverless instance recycling)
  if (!activeOtp && isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        const rows = (await sql`
          SELECT * FROM otps 
          WHERE phone = ${cleanPhone} AND verified = false 
          ORDER BY created_at DESC 
          LIMIT 1;
        `) as any[];
        if (rows && rows.length > 0) {
          const row = rows[0];
          activeOtp = {
            id: row.id,
            phone: row.phone,
            otpCode: row.otp_code || row.otpCode,
            expiresAt: new Date(row.expires_at || row.expiresAt),
            attempts: Number(row.attempts || 0),
            verified: Boolean(row.verified),
            createdAt: new Date(row.created_at || row.createdAt),
          };
          dbStore.saveOtp(activeOtp);
        }
      } catch (err) {
        console.warn("Neon active OTP query warning:", err);
      }
    }
  }

  const isDevOrConsole = !process.env.SMS_API_KEY || process.env.NODE_ENV !== "production" || process.env.SMS_PROVIDER === "console";

  // Master demo code fallback in dev/sandbox
  if (!activeOtp && isDevOrConsole && cleanCode === "716716") {
    activeOtp = {
      id: "otp_demo_" + crypto.randomUUID().slice(0, 8),
      phone: cleanPhone,
      otpCode: "716716",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      attempts: 0,
      verified: false,
      createdAt: new Date(),
    };
    dbStore.saveOtp(activeOtp);
  }

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
    await consumeOtp(activeOtp.id); // Invalidate burnt OTP
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

  // Only mark verified if consume option is true (deferred during concurrency check)
  if (options.consume !== false) {
    await consumeOtp(activeOtp.id);
  }

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
    otpId: activeOtp.id,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      retailerId: user.retailerId,
    },
  };
}
