import { describe, it, expect, beforeEach } from "vitest";
import {
  acquireRetailerSession,
  releaseRetailerSession,
  forceReleaseRetailerSession,
  touchRetailerSession,
} from "../lib/auth/session-lock";

describe("Kirana Concurrency Lock & Session Isolation", () => {
  beforeEach(async () => {
    // Reset test locks
    await forceReleaseRetailerSession("RET-0001");
    await forceReleaseRetailerSession("RET-0002");
  });

  it("allows initial login for Kirana store RET-0001", async () => {
    const res1 = await acquireRetailerSession("RET-0001", "usr_1", "9826000001");
    expect(res1.allowed).toBe(true);
    expect(res1.sessionId).toBeDefined();
  });

  it("blocks subsequent concurrent login for same Kirana store RET-0001 with 'User already logged in'", async () => {
    // First user logs in
    const firstLogin = await acquireRetailerSession("RET-0001", "usr_sharma_1", "9826000001");
    expect(firstLogin.allowed).toBe(true);

    // Second user attempts to log in as same Kirana store
    const secondLogin = await acquireRetailerSession("RET-0001", "usr_sharma_2", "9826000001");
    expect(secondLogin.allowed).toBe(false);
    expect(secondLogin.error).toBe("User already logged in");
    expect(secondLogin.code).toBe("USER_ALREADY_LOGGED_IN");
    expect(secondLogin.activeSince).toBeDefined();
  });

  it("keeps sessions independent: RET-0001 and RET-0002 can log in concurrently without blocking", async () => {
    // Sharma Kirana logs in
    const sharma = await acquireRetailerSession("RET-0001", "usr_sharma", "9826000001");
    expect(sharma.allowed).toBe(true);

    // Verma General Store logs in concurrently
    const verma = await acquireRetailerSession("RET-0002", "usr_verma", "9826000002");
    expect(verma.allowed).toBe(true);
    expect(verma.sessionId).not.toBe(sharma.sessionId);
  });

  it("allows login after previous session is released on logout", async () => {
    // First user logs in
    const first = await acquireRetailerSession("RET-0001", "usr_1", "9826000001");
    expect(first.allowed).toBe(true);

    // First user logs out
    await releaseRetailerSession("RET-0001", first.sessionId);

    // Second user logs in successfully
    const second = await acquireRetailerSession("RET-0001", "usr_2", "9826000001");
    expect(second.allowed).toBe(true);
  });

  it("allows force release to override locked session", async () => {
    // First user logs in
    const first = await acquireRetailerSession("RET-0001", "usr_1", "9826000001");
    expect(first.allowed).toBe(true);

    // Force release (user clicked 'Force Logout Existing Session')
    await forceReleaseRetailerSession("RET-0001");

    // Second user can now log in
    const second = await acquireRetailerSession("RET-0001", "usr_2", "9826000001");
    expect(second.allowed).toBe(true);
  });

  it("preserves OTP validity when verifyOtp is called with consume: false during concurrency block", async () => {
    const { createAndSendOtp, verifyOtp, consumeOtp } = await import("../lib/auth/otp");
    const sendRes = await createAndSendOtp("9826000001");
    expect(sendRes.success).toBe(true);
    const otpCode = sendRes.devOtp!;

    // Initial check without consuming (as done in verify-otp route)
    const check1 = await verifyOtp("9826000001", otpCode, { consume: false });
    expect(check1.success).toBe(true);
    expect(check1.otpId).toBeDefined();

    // Re-verify with same OTP still succeeds because it wasn't burned
    const check2 = await verifyOtp("9826000001", otpCode, { consume: false });
    expect(check2.success).toBe(true);

    // Consume OTP once session is granted
    await consumeOtp(check2.otpId);

    // Now OTP is consumed
    const check3 = await verifyOtp("9826000001", otpCode, { consume: true });
    // Should fail as burnt or no active request
    expect(check3.success).toBe(false);
  });
});
