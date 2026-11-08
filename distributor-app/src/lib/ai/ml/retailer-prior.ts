import { SeedSku } from "@/db/seed-data";
import { dbStore, StoredOrder, StoredOrderItem } from "@/db/store";

export interface RetailerSkuPrior {
  retailerId: string;
  skuId: string;
  orderCount: number;
  totalRetailerOrders: number;
  frequency: number; // orderCount / totalRetailerOrders in [0.0, 1.0]
  recencyDays: number; // days since last order of this SKU
  medianCases: number;
  historicalMaxCases: number;
  usualUnit: "CASE" | "PACK";
  isEstablished: boolean; // orderCount >= 3
}

export interface QuantityAnomalyResult {
  isAnomaly: boolean;
  orderCount: number;
  medianCases: number;
  historicalMaxCases: number;
  requestedCases: number;
  multiplierVsMedian: number;
  schemeSuppressed: boolean;
  warningMessage?: string;
}

export class RetailerPriorEngine {
  /**
   * Computes empirical Bayesian prior features for a given (retailer, SKU) pair from order history.
   */
  public getPrior(
    retailerId: string,
    skuId: string,
    now: Date = new Date()
  ): RetailerSkuPrior {
    const allOrders = dbStore.getAllOrders();
    const retailerOrders = allOrders.filter(
      (o) => o.order.retailerId === retailerId && o.order.status !== "CANCELLED"
    );

    const totalRetailerOrders = retailerOrders.length;
    if (totalRetailerOrders === 0) {
      return {
        retailerId,
        skuId,
        orderCount: 0,
        totalRetailerOrders: 0,
        frequency: 0,
        recencyDays: 999,
        medianCases: 0,
        historicalMaxCases: 0,
        usualUnit: "CASE",
        isEstablished: false,
      };
    }

    // Filter order items matching this SKU
    const matchingItems: StoredOrderItem[] = [];
    let lastOrderTimestamp: number | null = null;
    let packCount = 0;
    let caseCount = 0;

    for (const { order, items } of retailerOrders) {
      const item = items.find((it) => it.skuId === skuId);
      if (item) {
        matchingItems.push(item);
        if (item.quantityCases > 0) caseCount += item.quantityCases;
        if (item.quantityPacks && item.quantityPacks > 0) packCount += item.quantityPacks;

        const orderTime = new Date(order.createdAt).getTime();
        if (lastOrderTimestamp === null || orderTime > lastOrderTimestamp) {
          lastOrderTimestamp = orderTime;
        }
      }
    }

    const orderCount = matchingItems.length;
    const frequency = totalRetailerOrders > 0 ? orderCount / totalRetailerOrders : 0;
    const recencyDays =
      lastOrderTimestamp !== null
        ? Math.max(0, Math.floor((now.getTime() - lastOrderTimestamp) / (24 * 60 * 60 * 1000)))
        : 999;

    const caseQuantities = matchingItems
      .map((it) => it.quantityCases)
      .filter((q) => q > 0)
      .sort((a, b) => a - b);

    let medianCases = 0;
    let historicalMaxCases = 0;

    if (caseQuantities.length > 0) {
      historicalMaxCases = caseQuantities[caseQuantities.length - 1];
      const mid = Math.floor(caseQuantities.length / 2);
      medianCases =
        caseQuantities.length % 2 !== 0
          ? caseQuantities[mid]
          : (caseQuantities[mid - 1] + caseQuantities[mid]) / 2;
    }

    return {
      retailerId,
      skuId,
      orderCount,
      totalRetailerOrders,
      frequency: Math.round(frequency * 1000) / 1000,
      recencyDays,
      medianCases,
      historicalMaxCases,
      usualUnit: packCount > caseCount ? "PACK" : "CASE",
      isEstablished: orderCount >= 3,
    };
  }

  /**
   * Checks if an ordered quantity matches a promotional scheme threshold (Buy X Get Y, Slab minCases, etc.)
   * When a retailer orders 10 cases to hit a Buy 10 Get 1 promo, we suppress false outlier alarms.
   */
  public matchesSchemeThreshold(sku: SeedSku, requestedCases: number): boolean {
    if (!sku.schemeType || sku.schemeType === "NONE" || !sku.schemeDetail) {
      return false;
    }

    const detail = sku.schemeDetail;

    if (sku.schemeType === "FREE_GOODS" && detail.buyQty && detail.buyQty > 0) {
      // Exactly matches or is integer multiple of buyQty
      if (requestedCases === detail.buyQty || (requestedCases > 0 && requestedCases % detail.buyQty === 0)) {
        return true;
      }
    }

    if (sku.schemeType === "SLAB_DISCOUNT") {
      if (detail.minCases && requestedCases === detail.minCases) {
        return true;
      }
      if (detail.tiers && detail.tiers.length > 0) {
        const matchingTier = detail.tiers.find((t) => t.minCases === requestedCases);
        if (matchingTier) return true;
      }
    }

    if (sku.schemeType === "FLAT_REBATE") {
      const minCases = detail.minCasesForRebate || detail.minCases;
      if (minCases && requestedCases === minCases) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluates quantity outlier / 10x slip anomaly condition:
   * 1. Requires orderCount >= 3 for this SKU (established history)
   * 2. requestedCases > 3.0 * medianCases
   * 3. requestedCases > historicalMaxCases
   * 4. Exemption: does NOT hit an active scheme threshold
   */
  public detectQuantityAnomaly(
    retailerId: string,
    sku: SeedSku,
    requestedCases: number,
    requestedPacks: number = 0,
    multiplierThreshold: number = 3.0
  ): QuantityAnomalyResult {
    const prior = this.getPrior(retailerId, sku.id);

    // If no master cases ordered or not enough historical depth (less than 3 past orders), don't flag
    if (requestedCases <= 0 || !prior.isEstablished || prior.medianCases <= 0) {
      return {
        isAnomaly: false,
        orderCount: prior.orderCount,
        medianCases: prior.medianCases,
        historicalMaxCases: prior.historicalMaxCases,
        requestedCases,
        multiplierVsMedian: prior.medianCases > 0 ? requestedCases / prior.medianCases : 1.0,
        schemeSuppressed: false,
      };
    }

    const multiplierVsMedian = requestedCases / prior.medianCases;
    const isStatisticallyHigh =
      multiplierVsMedian > multiplierThreshold && requestedCases > prior.historicalMaxCases;

    if (!isStatisticallyHigh) {
      return {
        isAnomaly: false,
        orderCount: prior.orderCount,
        medianCases: prior.medianCases,
        historicalMaxCases: prior.historicalMaxCases,
        requestedCases,
        multiplierVsMedian: Math.round(multiplierVsMedian * 10) / 10,
        schemeSuppressed: false,
      };
    }

    // Check scheme threshold suppression exception
    const schemeSuppressed = this.matchesSchemeThreshold(sku, requestedCases);
    if (schemeSuppressed) {
      return {
        isAnomaly: false,
        orderCount: prior.orderCount,
        medianCases: prior.medianCases,
        historicalMaxCases: prior.historicalMaxCases,
        requestedCases,
        multiplierVsMedian: Math.round(multiplierVsMedian * 10) / 10,
        schemeSuppressed: true,
      };
    }

    return {
      isAnomaly: true,
      orderCount: prior.orderCount,
      medianCases: prior.medianCases,
      historicalMaxCases: prior.historicalMaxCases,
      requestedCases,
      multiplierVsMedian: Math.round(multiplierVsMedian * 10) / 10,
      schemeSuppressed: false,
      warningMessage: `⚠️ Quantity Check: You usually order ${prior.medianCases} cases (max ${prior.historicalMaxCases}). Please confirm ${requestedCases} cases.`,
    };
  }
}

export const retailerPriorEngine = new RetailerPriorEngine();
