import { describe, it, expect, beforeEach } from "vitest";
import { generateNumericOtp, createAndSendOtp, verifyOtp } from "@/lib/auth/otp";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { dbStore } from "@/db/store";

describe("Module 1 - Auth & OTP Verification Suite", () => {
  beforeEach(() => {
    dbStore.reset();
  });

  describe("OTP Generation & Formatting", () => {
    it("generates a 6-digit numeric string", () => {
      const otp = generateNumericOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it("generates varied cryptographic numbers", () => {
      const otp1 = generateNumericOtp();
      const otp2 = generateNumericOtp();
      expect(otp1).not.toEqual(otp2);
    });
  });

  describe("OTP Creation & Rate Limiting", () => {
    it("dispatches OTP successfully for a valid 10-digit phone", async () => {
      const res = await createAndSendOtp("9826000001");
      expect(res.success).toBe(true);
      expect(res.devOtp).toBeDefined();
      expect(res.devOtp).toHaveLength(6);
    });

    it("rejects invalid phone numbers with less than 10 digits", async () => {
      const res = await createAndSendOtp("12345");
      expect(res.success).toBe(false);
      expect(res.message).toContain("10-digit");
    });

    it("enforces rate limiting on immediate consecutive requests", async () => {
      const first = await createAndSendOtp("9826000001");
      expect(first.success).toBe(true);

      const second = await createAndSendOtp("9826000001");
      expect(second.success).toBe(false);
      expect(second.message).toContain("Please wait");
    });
  });

  describe("OTP Verification Logic", () => {
    it("verifies correct OTP code and loads registered retailer", async () => {
      const sendRes = await createAndSendOtp("9826000001");
      expect(sendRes.devOtp).toBeDefined();

      const verifyRes = await verifyOtp("9826000001", sendRes.devOtp!);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user).toBeDefined();
      expect(verifyRes.user?.phone).toBe("9826000001");
      expect(verifyRes.user?.role).toBe("retailer");
      expect(verifyRes.user?.retailerId).toBe("RET-0001");
    });

    it("verifies desk user correctly", async () => {
      const sendRes = await createAndSendOtp("9826000099");
      expect(sendRes.devOtp).toBeDefined();

      const verifyRes = await verifyOtp("9826000099", sendRes.devOtp!);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.role).toBe("desk");
      expect(verifyRes.user?.name).toContain("Order Desk");
    });

    it("verifies salesman user correctly", async () => {
      const sendRes = await createAndSendOtp("9826000018");
      expect(sendRes.devOtp).toBeDefined();

      const verifyRes = await verifyOtp("9826000018", sendRes.devOtp!);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.role).toBe("salesman");
    });

    it("rejects incorrect OTP and counts remaining attempts", async () => {
      const sendRes = await createAndSendOtp("9826000001");
      expect(sendRes.devOtp).toBeDefined();

      const failRes = await verifyOtp("9826000001", "000000");
      expect(failRes.success).toBe(false);
      expect(failRes.error).toContain("attempt(s) remaining");
    });

    it("burns OTP after 3 failed attempts for security", async () => {
      const sendRes = await createAndSendOtp("9826000001");
      expect(sendRes.devOtp).toBeDefined();

      await verifyOtp("9826000001", "000001");
      await verifyOtp("9826000001", "000002");
      await verifyOtp("9826000001", "000003");

      const fourth = await verifyOtp("9826000001", sendRes.devOtp!);
      expect(fourth.success).toBe(false);
      expect(fourth.error).toContain("Too many incorrect attempts");
    });
  });

  describe("Session JWT Signing & Verification", () => {
    it("signs and decrypts valid session token", async () => {
      const payload = {
        userId: "usr_1001",
        phone: "9826000001",
        name: "Ramesh Sharma",
        role: "retailer" as const,
        retailerId: "RET-0001",
      };

      const token = await signSessionToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe("usr_1001");
      expect(decoded?.phone).toBe("9826000001");
      expect(decoded?.role).toBe("retailer");
      expect(decoded?.retailerId).toBe("RET-0001");
    });

    it("detects and rejects tampered JWT tokens", async () => {
      const token = await signSessionToken({
        userId: "usr_1001",
        phone: "9826000001",
        name: "Ramesh Sharma",
        role: "retailer" as const,
      });

      // Tamper with the token string
      const tamperedToken = token.slice(0, -6) + "xxxxxx";
      const decoded = await verifySessionToken(tamperedToken);
      expect(decoded).toBeNull();
    });
  });
});
