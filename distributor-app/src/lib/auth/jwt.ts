import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  userId: string;
  phone: string;
  name: string;
  role: "retailer" | "salesman" | "desk";
  retailerId?: string;
}

export const SESSION_COOKIE_NAME = "auth_token";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "isolabs_jabalpur_distributor_secure_session_jwt_secret_key_2026";
  return new TextEncoder().encode(secret);
}

/**
 * Signs a cryptographic session JWT valid for 7 days
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secretKey = getSecretKey();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verifies and decodes a session JWT, returning null if invalid or expired
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.userId || !payload.role || !payload.phone) {
      return null;
    }

    return {
      userId: payload.userId as string,
      phone: payload.phone as string,
      name: (payload.name as string) || "User",
      role: payload.role as "retailer" | "salesman" | "desk",
      retailerId: payload.retailerId as string | undefined,
    };
  } catch {
    return null;
  }
}
