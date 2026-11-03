import {
  SEED_RETAILERS,
  SEED_USERS,
  SEED_SKUS,
  SeedRetailer,
  SeedUser,
  SeedSku,
} from "./seed-data";

export interface StoredOtp {
  id: string;
  phone: string;
  otpCode: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}

// In-memory state persistent across route handlers during process runtime
class MemoryStore {
  private users: Map<string, SeedUser> = new Map();
  private retailers: Map<string, SeedRetailer> = new Map();
  private skus: Map<string, SeedSku> = new Map();
  private otps: Map<string, StoredOtp> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.users.clear();
    this.retailers.clear();
    this.skus.clear();
    this.otps.clear();

    for (const r of SEED_RETAILERS) {
      this.retailers.set(r.id, { ...r });
    }
    for (const u of SEED_USERS) {
      this.users.set(u.id, { ...u });
    }
    for (const s of SEED_SKUS) {
      this.skus.set(s.id, { ...s });
    }
  }

  // --- User Operations ---
  public getUserByPhone(phone: string): SeedUser | undefined {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    return Array.from(this.users.values()).find(
      (u) => u.phone.replace(/\D/g, "").slice(-10) === cleanPhone
    );
  }

  public getUserById(id: string): SeedUser | undefined {
    return this.users.get(id);
  }

  public createUser(user: SeedUser): SeedUser {
    this.users.set(user.id, user);
    return user;
  }

  // --- Retailer Operations ---
  public getRetailerByPhone(phone: string): SeedRetailer | undefined {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    return Array.from(this.retailers.values()).find(
      (r) => r.phone.replace(/\D/g, "").slice(-10) === cleanPhone
    );
  }

  public getRetailerById(id: string): SeedRetailer | undefined {
    return this.retailers.get(id);
  }

  public createRetailer(retailer: SeedRetailer): SeedRetailer {
    this.retailers.set(retailer.id, retailer);
    return retailer;
  }

  public getAllRetailers(): SeedRetailer[] {
    return Array.from(this.retailers.values());
  }

  // --- SKU Operations ---
  public getAllSkus(): SeedSku[] {
    return Array.from(this.skus.values());
  }

  public getSkuById(id: string): SeedSku | undefined {
    return this.skus.get(id);
  }

  public getSkuByCode(code: string): SeedSku | undefined {
    return Array.from(this.skus.values()).find((s) => s.code === code);
  }

  // --- OTP Operations ---
  public saveOtp(otp: StoredOtp): void {
    this.otps.set(otp.id, otp);
  }

  public getLatestActiveOtp(phone: string): StoredOtp | undefined {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const matches = Array.from(this.otps.values())
      .filter((o) => o.phone.replace(/\D/g, "").slice(-10) === cleanPhone && !o.verified)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matches[0];
  }

  public markOtpVerified(id: string): void {
    const otp = this.otps.get(id);
    if (otp) {
      otp.verified = true;
      this.otps.set(id, otp);
    }
  }

  public incrementOtpAttempts(id: string): number {
    const otp = this.otps.get(id);
    if (otp) {
      otp.attempts += 1;
      this.otps.set(id, otp);
      return otp.attempts;
    }
    return 0;
  }
}

// Global singleton to persist across HMR in Next.js development
const globalForStore = globalThis as unknown as { appStore?: MemoryStore };
export const dbStore = globalForStore.appStore ?? new MemoryStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.appStore = dbStore;
}
