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
  retailerName?: string;
  route?: string;
  placedBy: string;
  orderSource?: "WHATSAPP_AI" | "PORTAL_CATALOGUE" | "SALESMAN_COUNTER";
  rawUtterance?: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio";
  creditHoldReason?: string;
  holdReleasedBy?: string;
  holdReleaseNote?: string;
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

export interface StoredAlias {
  id: string;
  retailerId: string;
  rawPhrase: string;
  skuId: string;
  skuName: string;
  timesUsed: number;
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
  quantityPacks?: number;
  freeCases: number;
  unitDealerPrice: number;
  unitPackPrice?: number;
  discountPct: number;
  discountAmount: number;
  netLineAmount: number;
  gstRate: number;
  gstAmount: number;
}

export interface VanPickItem {
  skuId: string;
  skuCode: string;
  skuName: string;
  brand: string;
  unitsPerCase: number;
  paidCases: number;
  freeCases: number;
  totalCases: number;
  totalPacks: number;
  approxWeightKg: number;
}

export interface VanDeliveryStop {
  stopNumber: number;
  orderId: string;
  orderStatus: string;
  retailerId: string;
  retailerName: string;
  ownerName: string;
  phone: string;
  address: string;
  route: string;
  totalCases: number;
  freeCases: number;
  grandTotal: number;
  paymentMode: "CREDIT" | "CASH_ON_DELIVERY";
  lines: Array<{
    skuId: string;
    skuName: string;
    paidCases: number;
    freeCases: number;
  }>;
}

export interface VanRouteManifest {
  route: string;
  vanNumber: string;
  driverName: string;
  dispatchDate: string;
  totalOrders: number;
  totalMasterCases: number;
  totalFreeCases: number;
  totalWholesaleValue: number;
  approxTotalWeightKg: number;
  pickList: VanPickItem[];
  stops: VanDeliveryStop[];
}

export interface DormantRetailerRecord {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  route: string;
  daysInactive: number;
  lastOrderDate: Date;
  avgOrderValue: number;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  churnRisk: "CRITICAL" | "HIGH" | "MODERATE";
  activePromoTextHindi: string;
  whatsappDeepLink: string;
}

// In-memory state persistent across route handlers during process runtime
class MemoryStore {
  private users: Map<string, SeedUser> = new Map();
  private retailers: Map<string, SeedRetailer> = new Map();
  private skus: Map<string, SeedSku> = new Map();
  private otps: Map<string, StoredOtp> = new Map();
  private orders: Map<string, StoredOrder> = new Map();
  private orderItems: Map<string, StoredOrderItem[]> = new Map();
  private aliases: Map<string, StoredAlias> = new Map();

  constructor() {
    this.reset();
  }

  public resetToAbsoluteZero() {
    this.users.clear();
    this.retailers.clear();
    this.skus.clear();
    this.otps.clear();
    this.orders.clear();
    this.orderItems.clear();
    this.aliases.clear();

    // Keep desk clerk account so desk/setup is accessible
    this.users.set("USR-DESK-1", {
      id: "USR-DESK-1",
      phone: "9826000099",
      name: "Amit Jain (Order Desk)",
      role: "desk",
      active: true,
    });
  }

  public reset(includeDefaultOrders: boolean = true) {
    this.users.clear();
    this.retailers.clear();
    this.skus.clear();
    this.otps.clear();
    this.orders.clear();
    this.orderItems.clear();
    this.aliases.clear();

    for (const r of SEED_RETAILERS) {
      this.retailers.set(r.id, { ...r });
    }
    for (const u of SEED_USERS) {
      this.users.set(u.id, { ...u });
    }
    for (const s of SEED_SKUS) {
      this.skus.set(s.id, { ...s });
    }

    if (includeDefaultOrders) {
      this.seedDefaultOrders();
    }
  }

  private seedDefaultOrders() {
    // Seed realistic Jabalpur distributor orders for the Order Desk
    const order1Id = "ORD-10482";
    const order1: StoredOrder = {
      id: order1Id,
      retailerId: "RET-0001",
      retailerName: "Sharma Kirana Store",
      route: "Napier Town Route #4",
      placedBy: "Ramesh Sharma",
      orderSource: "WHATSAPP_AI",
      rawUtterance: "bhaiya 5 peti biscuit chhota, 2 peti ghadi powder 1 kg",
      status: "PLACED",
      subtotal: 7948,
      schemeDiscount: 0,
      taxableAmount: 7948,
      totalGst: 1430.64,
      grandTotal: 9378.64,
      freeGoodsTally: [],
      occVersion: 1,
      createdAt: new Date(Date.now() - 35 * 60 * 1000),
      updatedAt: new Date(Date.now() - 35 * 60 * 1000),
    };
    const order1Items: StoredOrderItem[] = [
      {
        id: "item_10482_1",
        orderId: order1Id,
        skuId: "SKU-BS-075",
        skuCode: "SKU-BS-075",
        skuName: "Glucose biscuit 75 g, case of 96",
        quantityCases: 5,
        freeCases: 0,
        unitDealerPrice: 777.6,
        discountPct: 0,
        discountAmount: 0,
        netLineAmount: 3888.0,
        gstRate: 18,
        gstAmount: 699.84,
      },
      {
        id: "item_10482_2",
        orderId: order1Id,
        skuId: "SKU-DT-1KG",
        skuCode: "SKU-DT-1KG",
        skuName: "Detergent powder 1 kg, case of 20",
        quantityCases: 2,
        freeCases: 0,
        unitDealerPrice: 2030.0,
        discountPct: 0,
        discountAmount: 0,
        netLineAmount: 4060.0,
        gstRate: 18,
        gstAmount: 730.8,
      },
    ];
    this.orders.set(order1Id, order1);
    this.orderItems.set(order1Id, order1Items);

    const order2Id = "ORD-10483";
    const order2: StoredOrder = {
      id: order2Id,
      retailerId: "RET-0002",
      retailerName: "Gupta General Store",
      route: "Wright Town Route #2",
      placedBy: "Suresh Gupta",
      orderSource: "WHATSAPP_AI",
      rawUtterance: "detergent powder of 1 kg case of 20 mai se 15 dedo, 10 peti biscuit",
      status: "CREDIT_HOLD",
      creditHoldReason: "Exceeds ₹30,000 credit limit (Outstanding ₹29,000 + Order ₹30,308 = ₹59,308)",
      subtotal: 25990,
      schemeDiscount: 304.5,
      taxableAmount: 25685.5,
      totalGst: 4623.39,
      grandTotal: 30308.89,
      freeGoodsTally: [{ skuId: "SKU-BS-075", skuName: "Glucose biscuit 75 g, case of 96", freeCases: 1 }],
      occVersion: 1,
      createdAt: new Date(Date.now() - 110 * 60 * 1000),
      updatedAt: new Date(Date.now() - 110 * 60 * 1000),
    };
    const order2Items: StoredOrderItem[] = [
      {
        id: "item_10483_1",
        orderId: order2Id,
        skuId: "SKU-BS-075",
        skuCode: "SKU-BS-075",
        skuName: "Glucose biscuit 75 g, case of 96",
        quantityCases: 10,
        freeCases: 1,
        unitDealerPrice: 777.6,
        discountPct: 0,
        discountAmount: 0,
        netLineAmount: 7776.0,
        gstRate: 18,
        gstAmount: 1399.68,
      },
      {
        id: "item_10483_2",
        orderId: order2Id,
        skuId: "SKU-DT-1KG",
        skuCode: "SKU-DT-1KG",
        skuName: "Detergent powder 1 kg, case of 20",
        quantityCases: 5,
        freeCases: 0,
        unitDealerPrice: 2030.0,
        discountPct: 3,
        discountAmount: 304.5,
        netLineAmount: 9845.5,
        gstRate: 18,
        gstAmount: 1772.19,
      },
      {
        id: "item_10483_3",
        orderId: order2Id,
        skuId: "SKU-BS-GD120",
        skuCode: "SKU-BS-GD120",
        skuName: "Good Day Butter Cookies 120 g, case of 48",
        quantityCases: 6,
        freeCases: 0,
        unitDealerPrice: 1344.0,
        discountPct: 0,
        discountAmount: 0,
        netLineAmount: 8064.0,
        gstRate: 18,
        gstAmount: 1451.52,
      },
    ];
    this.orders.set(order2Id, order2);
    this.orderItems.set(order2Id, order2Items);

    const order3Id = "ORD-10484";
    const order3: StoredOrder = {
      id: order3Id,
      retailerId: "RET-0003",
      retailerName: "Mahavir Kirana",
      route: "Gorakhpur Route #1",
      placedBy: "Sunil Jain",
      orderSource: "PORTAL_CATALOGUE",
      status: "VERIFIED",
      subtotal: 13824,
      schemeDiscount: 0,
      taxableAmount: 13824,
      totalGst: 2488.32,
      grandTotal: 16312.32,
      freeGoodsTally: [],
      occVersion: 2,
      createdAt: new Date(Date.now() - 180 * 60 * 1000),
      updatedAt: new Date(Date.now() - 90 * 60 * 1000),
    };
    const order3Items: StoredOrderItem[] = [
      {
        id: "item_10484_1",
        orderId: order3Id,
        skuId: "SKU-BS-MG250",
        skuCode: "SKU-BS-MG250",
        skuName: "Marie Gold Tea Biscuit 250 g, case of 36",
        quantityCases: 4,
        freeCases: 0,
        unitDealerPrice: 1296.0,
        discountPct: 0,
        discountAmount: 0,
        netLineAmount: 5184.0,
        gstRate: 18,
        gstAmount: 933.12,
      },
      {
        id: "item_10484_2",
        orderId: order3Id,
        skuId: "SKU-DT-CK250",
        skuCode: "SKU-DT-CK250",
        skuName: "Ghadi Detergent Cake 250 g, case of 80",
        quantityCases: 6,
        freeCases: 0,
        unitDealerPrice: 1440.0,
        discountPct: 0,
        discountAmount: 0,
        netLineAmount: 8640.0,
        gstRate: 18,
        gstAmount: 1555.2,
      },
    ];
    this.orders.set(order3Id, order3);
    this.orderItems.set(order3Id, order3Items);

    const order4Id = "ORD-10485";
    const order4: StoredOrder = {
      id: order4Id,
      retailerId: "RET-0004",
      retailerName: "Agrawal Provision",
      route: "Adhartal Route #3",
      placedBy: "Manoj Agrawal",
      orderSource: "SALESMAN_COUNTER",
      status: "EXPORTED_TALLY",
      subtotal: 18991.53,
      schemeDiscount: 0,
      taxableAmount: 18991.53,
      totalGst: 3418.47,
      grandTotal: 22410.0,
      freeGoodsTally: [],
      tallyExportedAt: new Date(Date.now() - 45 * 60 * 1000),
      occVersion: 3,
      createdAt: new Date(Date.now() - 320 * 60 * 1000),
      updatedAt: new Date(Date.now() - 45 * 60 * 1000),
    };
    this.orders.set(order4Id, order4);
    this.orderItems.set(order4Id, []);

    // Seed default auto-learned alias
    this.saveRetailerAlias("RET-0001", "biscuit chhota", "SKU-BS-075");
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

  public updateOrderDetails(
    orderId: string,
    items: StoredOrderItem[],
    totals: {
      subtotal: number;
      schemeDiscount: number;
      taxableAmount: number;
      totalGst: number;
      grandTotal: number;
      freeGoodsTally: Array<{ skuId: string; skuName: string; freeCases: number }>;
    },
    status: StoredOrder["status"],
    expectedOccVersion?: number
  ): { success: boolean; order?: StoredOrder; items?: StoredOrderItem[]; error?: string; conflict?: boolean } {
    const order = this.orders.get(orderId);
    if (!order) return { success: false, error: "Order not found" };

    if (expectedOccVersion !== undefined && order.occVersion !== expectedOccVersion) {
      return {
        success: false,
        conflict: true,
        error: `OCC Conflict: Order was modified by another user (expected version ${expectedOccVersion}, current is ${order.occVersion})`,
      };
    }

    order.subtotal = totals.subtotal;
    order.schemeDiscount = totals.schemeDiscount;
    order.taxableAmount = totals.taxableAmount;
    order.totalGst = totals.totalGst;
    order.grandTotal = totals.grandTotal;
    order.freeGoodsTally = totals.freeGoodsTally;
    order.status = status;
    order.occVersion += 1;
    order.updatedAt = new Date();

    this.orders.set(orderId, order);
    this.orderItems.set(orderId, items);

    return { success: true, order, items };
  }

  public releaseCreditHold(
    orderId: string,
    expectedOccVersion?: number,
    authorizedBy: string = "Sunil Clerk",
    approvalNote: string = "Authorized by distributor office"
  ): { success: boolean; order?: StoredOrder; error?: string; conflict?: boolean } {
    const order = this.orders.get(orderId);
    if (!order) return { success: false, error: "Order not found" };

    if (expectedOccVersion !== undefined && order.occVersion !== expectedOccVersion) {
      return {
        success: false,
        conflict: true,
        error: `OCC Conflict: Order was modified by another user (expected version ${expectedOccVersion}, current is ${order.occVersion})`,
      };
    }

    order.status = "VERIFIED";
    order.holdReleasedBy = authorizedBy;
    order.holdReleaseNote = approvalNote;
    order.occVersion += 1;
    order.updatedAt = new Date();

    this.orders.set(orderId, order);
    return { success: true, order };
  }

  public saveRetailerAlias(retailerId: string, rawPhrase: string, skuId: string): StoredAlias {
    const cleanPhrase = rawPhrase.trim().toLowerCase();
    const key = `${retailerId}_${cleanPhrase}`;
    const sku = this.skus.get(skuId);
    const existing = this.aliases.get(key);

    if (existing) {
      existing.skuId = skuId;
      existing.skuName = sku?.name || existing.skuName;
      existing.timesUsed += 1;
      existing.updatedAt = new Date();
      this.aliases.set(key, existing);
      return existing;
    }

    const newAlias: StoredAlias = {
      id: `alias_${crypto.randomUUID().slice(0, 8)}`,
      retailerId,
      rawPhrase: cleanPhrase,
      skuId,
      skuName: sku?.name || skuId,
      timesUsed: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.aliases.set(key, newAlias);
    return newAlias;
  }

  public getRetailerAliases(retailerId: string): StoredAlias[] {
    return Array.from(this.aliases.values())
      .filter((a) => a.retailerId === retailerId)
      .sort((a, b) => b.timesUsed - a.timesUsed);
  }

  public getDeskStats() {
    let total = 0;
    let needsReview = 0;
    let creditHold = 0;
    let verified = 0;
    let exported = 0;
    let totalValue = 0;

    for (const o of this.orders.values()) {
      total += 1;
      totalValue += o.grandTotal;
      if (o.status === "PLACED") needsReview += 1;
      else if (o.status === "CREDIT_HOLD") creditHold += 1;
      else if (o.status === "VERIFIED") verified += 1;
      else if (o.status === "EXPORTED_TALLY") exported += 1;
    }

    return {
      totalOrders: total,
      needsReviewCount: needsReview,
      creditHoldCount: creditHold,
      verifiedCount: verified,
      exportedCount: exported,
      totalWholesaleValue: Math.round(totalValue * 100) / 100,
    };
  }

  public deductSkuStock(skuId: string, casesToDeduct: number): boolean {
    const sku = this.skus.get(skuId);
    if (!sku) return false;
    if (sku.stockCases < casesToDeduct) return false; // Prevent negative inventory (Rule [A9])
    sku.stockCases -= casesToDeduct;
    this.skus.set(skuId, sku);
    return true;
  }

  public getVanManifest(targetRoute?: string): {
    availableRoutes: string[];
    selectedRoute: string;
    manifest: VanRouteManifest;
  } {
    const allOrdersWithItems = this.getAllOrders();

    // 1. Discover available routes across orders and retailers
    const routeSet = new Set<string>();
    for (const { order } of allOrdersWithItems) {
      if (order.status !== "CANCELLED") {
        const ret = this.getRetailerById(order.retailerId);
        const routeName = order.route || ret?.route;
        if (routeName) routeSet.add(routeName);
      }
    }
    for (const ret of this.retailers.values()) {
      if (ret.route) routeSet.add(ret.route);
    }

    const availableRoutes = Array.from(routeSet);
    if (availableRoutes.length === 0) {
      availableRoutes.push("Napier Town Route #4", "Wright Town Route #2", "Gorakhpur Route #1");
    }

    const selectedRoute =
      targetRoute && availableRoutes.includes(targetRoute)
        ? targetRoute
        : availableRoutes.find((r) => r.includes("Napier")) || availableRoutes[0];

    // 2. Filter orders matching selectedRoute (VERIFIED, EXPORTED_TALLY, and PLACED)
    const routeOrders = allOrdersWithItems.filter(({ order }) => {
      if (order.status === "CANCELLED") return false;
      const ret = this.getRetailerById(order.retailerId);
      const r = order.route || ret?.route || "";
      return r === selectedRoute || (!r && selectedRoute.includes("Napier"));
    });

    // 3. Van & Driver metadata
    const vanNumber = selectedRoute.includes("Napier")
      ? "MP-20-GA-4812 (Van 04)"
      : selectedRoute.includes("Wright")
      ? "MP-20-GA-3319 (Van 02)"
      : "MP-20-GA-7721 (Van 01)";
    const driverName = selectedRoute.includes("Napier")
      ? "Mukesh Yadav (Ph: 9425100044)"
      : "Raju Kushwaha (Ph: 9425100088)";

    // 4. Aggregate Pick List by SKU across all route orders (Rule [A22])
    const pickMap = new Map<
      string,
      {
        skuId: string;
        skuCode: string;
        skuName: string;
        brand: string;
        unitsPerCase: number;
        paidCases: number;
        freeCases: number;
        approxWeightKg: number;
      }
    >();

    let totalMasterCases = 0;
    let totalFreeCases = 0;
    let totalWholesaleValue = 0;

    for (const { order, items } of routeOrders) {
      totalWholesaleValue += order.grandTotal;
      for (const item of items) {
        totalMasterCases += item.quantityCases + item.freeCases;
        totalFreeCases += item.freeCases;

        const sku = this.getSkuById(item.skuId);
        const unitsPerCase = sku?.unitsPerCase || 24;
        const brand = sku?.brand || "Company A";

        // Approximated weight per master case
        let caseWeight = 10;
        if (sku?.packSize?.includes("75")) caseWeight = 7.2;
        else if (sku?.packSize?.includes("120")) caseWeight = 6.0;
        else if (sku?.packSize?.includes("1 kg") || sku?.packSize?.includes("1kg")) caseWeight = 20.0;
        else if (sku?.packSize?.includes("250")) caseWeight = 10.0;

        const existing = pickMap.get(item.skuId);
        if (existing) {
          existing.paidCases += item.quantityCases;
          existing.freeCases += item.freeCases;
          existing.approxWeightKg += (item.quantityCases + item.freeCases) * caseWeight;
        } else {
          pickMap.set(item.skuId, {
            skuId: item.skuId,
            skuCode: item.skuCode || item.skuId,
            skuName: item.skuName || sku?.name || item.skuId,
            brand,
            unitsPerCase,
            paidCases: item.quantityCases,
            freeCases: item.freeCases,
            approxWeightKg: (item.quantityCases + item.freeCases) * caseWeight,
          });
        }
      }
    }

    const pickList: VanPickItem[] = Array.from(pickMap.values()).map((p) => ({
      ...p,
      totalCases: p.paidCases + p.freeCases,
      totalPacks: (p.paidCases + p.freeCases) * p.unitsPerCase,
      approxWeightKg: Math.round(p.approxWeightKg * 10) / 10,
    }));

    const approxTotalWeightKg = pickList.reduce((acc, p) => acc + p.approxWeightKg, 0);

    // 5. Build Stop Sequence
    const stops: VanDeliveryStop[] = routeOrders.map((ro, index) => {
      const ret = this.getRetailerById(ro.order.retailerId);
      const isCredit = (ret?.creditLimit || 0) > 0 && !ro.order.creditHoldReason;
      const orderTotalCases = ro.items.reduce((acc, it) => acc + it.quantityCases + it.freeCases, 0);
      const orderFreeCases = ro.items.reduce((acc, it) => acc + it.freeCases, 0);

      return {
        stopNumber: index + 1,
        orderId: ro.order.id,
        orderStatus: ro.order.status,
        retailerId: ro.order.retailerId,
        retailerName: ro.order.retailerName || ret?.name || "Kirana Store",
        ownerName: ret?.ownerName || ro.order.placedBy || "Shop Owner",
        phone: ret?.phone || "9826000001",
        address: ret?.address || "Jabalpur",
        route: selectedRoute,
        totalCases: orderTotalCases,
        freeCases: orderFreeCases,
        grandTotal: ro.order.grandTotal,
        paymentMode: isCredit ? "CREDIT" : "CASH_ON_DELIVERY",
        lines: ro.items.map((it) => ({
          skuId: it.skuId,
          skuName: it.skuName || it.skuId,
          paidCases: it.quantityCases,
          freeCases: it.freeCases,
        })),
      };
    });

    const manifest: VanRouteManifest = {
      route: selectedRoute,
      vanNumber,
      driverName,
      dispatchDate: new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      totalOrders: routeOrders.length,
      totalMasterCases,
      totalFreeCases,
      totalWholesaleValue: Math.round(totalWholesaleValue * 100) / 100,
      approxTotalWeightKg: Math.round(approxTotalWeightKg * 10) / 10,
      pickList,
      stops,
    };

    return {
      availableRoutes,
      selectedRoute,
      manifest,
    };
  }

  public getDormantRetailers(inactivityDays = 14): {
    totalRetailers: number;
    dormantCount: number;
    dormantRetailers: DormantRetailerRecord[];
  } {
    const records: DormantRetailerRecord[] = [];
    const now = Date.now();

    for (const ret of this.retailers.values()) {
      let latestDate: Date = ret.lastOrderAt || new Date(now - 25 * 24 * 60 * 60 * 1000);
      let totalOrderedValue = 0;
      let orderCount = 0;

      for (const ord of this.orders.values()) {
        if (ord.retailerId === ret.id) {
          orderCount += 1;
          totalOrderedValue += ord.grandTotal;
          if (ord.createdAt > latestDate) {
            latestDate = ord.createdAt;
          }
        }
      }

      const daysInactive = Math.max(1, Math.floor((now - latestDate.getTime()) / (1000 * 60 * 60 * 24)));

      if (daysInactive >= inactivityDays) {
        const avgOrderValue =
          orderCount > 0
            ? Math.round(totalOrderedValue / orderCount)
            : Math.round((ret.creditLimit || 30000) * 0.45);

        const availableCredit = Math.max(0, ret.creditLimit - ret.currentBalance);

        let churnRisk: "CRITICAL" | "HIGH" | "MODERATE" = "MODERATE";
        if (daysInactive >= 21) churnRisk = "CRITICAL";
        else if (daysInactive >= 14) churnRisk = "HIGH";

        const promoTextHindi = `नमस्ते ${ret.ownerName} जी! Company A जबलपुर से। आपके दुकान '${ret.name}' पर पिछले ${daysInactive} दिनों से आर्डर नहीं लगा है। आज Parle-G बिस्कुट पर 10 पेटी पर 1 पेटी फ्री और डिटर्जेंट पर 3% अतिरिक्त छूट की विशेष स्कीम चालू है। आर्डर लगाने के लिए यहाँ क्लिक करें: http://localhost:3000/catalogue`;

        const whatsappDeepLink = `https://wa.me/91${ret.phone}?text=${encodeURIComponent(promoTextHindi)}`;

        records.push({
          id: ret.id,
          name: ret.name,
          ownerName: ret.ownerName,
          phone: ret.phone,
          address: ret.address,
          route: ret.route,
          daysInactive,
          lastOrderDate: latestDate,
          avgOrderValue,
          creditLimit: ret.creditLimit,
          currentBalance: ret.currentBalance,
          availableCredit,
          churnRisk,
          activePromoTextHindi: promoTextHindi,
          whatsappDeepLink,
        });
      }
    }

    records.sort((a, b) => b.daysInactive - a.daysInactive);

    return {
      totalRetailers: this.retailers.size,
      dormantCount: records.length,
      dormantRetailers: records,
    };
  }
}

// Global singleton to persist across HMR in Next.js development
const globalForStore = globalThis as unknown as { appStore?: MemoryStore };
export const dbStore = globalForStore.appStore ?? new MemoryStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.appStore = dbStore;
}
