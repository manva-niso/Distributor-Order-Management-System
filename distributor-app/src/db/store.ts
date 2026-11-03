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

export interface StoredOrder {
  id: string;
  retailerId: string;
  placedBy: string;
  status: "PLACED" | "VERIFIED" | "CREDIT_HOLD" | "EXPORTED_TALLY" | "CANCELLED";
  subtotal: number;
  schemeDiscount: number;
  taxableAmount: number;
  totalGst: number;
  grandTotal: number;
  freeGoodsTally: Array<{ skuId: string; skuName: string; freeCases: number }>;
  occVersion: number;
  tallyExportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredOrderItem {
  id: string;
  orderId: string;
  skuId: string;
  skuName?: string;
  skuCode?: string;
  quantityCases: number;
  freeCases: number;
  unitDealerPrice: number;
  discountPct: number;
  discountAmount: number;
  netLineAmount: number;
  gstRate: number;
  gstAmount: number;
}

// In-memory state persistent across route handlers during process runtime
class MemoryStore {
  private users: Map<string, SeedUser> = new Map();
  private retailers: Map<string, SeedRetailer> = new Map();
  private skus: Map<string, SeedSku> = new Map();
  private otps: Map<string, StoredOtp> = new Map();
  private orders: Map<string, StoredOrder> = new Map();
  private orderItems: Map<string, StoredOrderItem[]> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.users.clear();
    this.retailers.clear();
    this.skus.clear();
    this.otps.clear();
    this.orders.clear();
    this.orderItems.clear();

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

  // --- Batch Import & Master Data Operations ---
  public importSkus(newSkus: SeedSku[], mode: "replace" | "merge" = "merge"): { count: number } {
    if (mode === "replace") {
      this.skus.clear();
    }
    for (const sku of newSkus) {
      this.skus.set(sku.id, sku);
    }
    return { count: this.skus.size };
  }

  public importRetailers(newRetailers: SeedRetailer[], mode: "replace" | "merge" = "merge"): { count: number } {
    if (mode === "replace") {
      this.retailers.clear();
      // Keep desk and salesman users, clear retailer users
      const coreUsers = Array.from(this.users.values()).filter((u) => u.role !== "retailer");
      this.users.clear();
      for (const u of coreUsers) {
        this.users.set(u.id, u);
      }
    }
    for (const r of newRetailers) {
      this.retailers.set(r.id, r);
      // Auto-provision user account for this retailer
      const cleanPhone = r.phone.replace(/\D/g, "").slice(-10);
      const existingUser = this.getUserByPhone(cleanPhone);
      if (!existingUser) {
        this.createUser({
          id: `usr_${r.id}`,
          phone: cleanPhone,
          name: r.ownerName,
          role: "retailer",
          retailerId: r.id,
          active: true,
        });
      }
    }
    return { count: this.retailers.size };
  }

  public getStoreStats() {
    let totalStockCases = 0;
    let totalWholesaleValue = 0;
    for (const sku of this.skus.values()) {
      totalStockCases += sku.stockCases;
      totalWholesaleValue += sku.stockCases * sku.dealerPrice;
    }
    return {
      totalSkus: this.skus.size,
      totalRetailers: this.retailers.size,
      totalOrders: this.orders.size,
      totalStockCases,
      totalWholesaleValue: Math.round(totalWholesaleValue),
    };
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

  // --- Order & Ledger Operations ---
  public createOrder(
    order: StoredOrder,
    items: StoredOrderItem[]
  ): { order: StoredOrder; items: StoredOrderItem[] } {
    this.orders.set(order.id, order);
    this.orderItems.set(order.id, items);

    // Atomically update retailer ledger and last order timestamp
    const retailer = this.retailers.get(order.retailerId);
    if (retailer) {
      retailer.currentBalance += order.grandTotal;
      retailer.lastOrderAt = order.createdAt;
      this.retailers.set(retailer.id, retailer);
    }

    return { order, items };
  }

  public getOrderById(id: string): { order: StoredOrder; items: StoredOrderItem[] } | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const items = this.orderItems.get(id) || [];
    return { order, items };
  }

  public getOrdersByRetailerId(retailerId: string): Array<{ order: StoredOrder; items: StoredOrderItem[] }> {
    const retailerOrders: Array<{ order: StoredOrder; items: StoredOrderItem[] }> = [];
    for (const order of this.orders.values()) {
      if (order.retailerId === retailerId) {
        const items = this.orderItems.get(order.id) || [];
        retailerOrders.push({ order, items });
      }
    }
    return retailerOrders.sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime());
  }

  public getAllOrders(): Array<{ order: StoredOrder; items: StoredOrderItem[] }> {
    const all: Array<{ order: StoredOrder; items: StoredOrderItem[] }> = [];
    for (const order of this.orders.values()) {
      const items = this.orderItems.get(order.id) || [];
      all.push({ order, items });
    }
    return all.sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime());
  }

  public updateOrderStatus(
    orderId: string,
    status: StoredOrder["status"],
    expectedOccVersion?: number
  ): { success: boolean; order?: StoredOrder; error?: string } {
    const order = this.orders.get(orderId);
    if (!order) return { success: false, error: "Order not found" };

    // Optimistic Concurrency Control (OCC) Guard (Rule [A19])
    if (expectedOccVersion !== undefined && order.occVersion !== expectedOccVersion) {
      return {
        success: false,
        error: `OCC Conflict: Order was modified by another user (expected version ${expectedOccVersion}, current is ${order.occVersion})`,
      };
    }

    order.status = status;
    order.occVersion += 1;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);
    return { success: true, order };
  }

  public deductSkuStock(skuId: string, casesToDeduct: number): boolean {
    const sku = this.skus.get(skuId);
    if (!sku) return false;
    if (sku.stockCases < casesToDeduct) return false; // Prevent negative inventory (Rule [A9])
    sku.stockCases -= casesToDeduct;
    this.skus.set(skuId, sku);
    return true;
  }
}

// Global singleton to persist across HMR in Next.js development
const globalForStore = globalThis as unknown as { appStore?: MemoryStore };
export const dbStore = globalForStore.appStore ?? new MemoryStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.appStore = dbStore;
}
