import { describe, it, expect, beforeEach } from "vitest";
import { dbStore } from "@/db/store";
import {
  getStockVersion,
  getLatestStockSnapshot,
  broadcastStockUpdate,
  subscribeToStockUpdates,
  StockUpdateEvent,
} from "@/lib/catalogue/inventory-events";
import { GET as getLiveStock } from "@/app/api/catalogue/live-stock/route";
import { NextRequest } from "next/server";

describe("Module 2 & 4: Real-Time Warehouse Stock Synchronization Engine", () => {
  beforeEach(() => {
    dbStore.reset(false);
  });

  it("increments stock version and notifies subscribers when broadcastStockUpdate is triggered", () => {
    const vBefore = getStockVersion();
    let receivedEvent: StockUpdateEvent | null = null;

    const unsubscribe = subscribeToStockUpdates((event) => {
      receivedEvent = event;
    });

    const broadcasted = broadcastStockUpdate();
    unsubscribe();

    expect(getStockVersion()).toBe(vBefore + 1);
    expect(broadcasted.stockVersion).toBe(vBefore + 1);
    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent!.type).toBe("STOCK_UPDATE");
    expect(receivedEvent!.stockVersion).toBe(vBefore + 1);
    expect(receivedEvent!.skus.length).toBeGreaterThan(0);
  });

  it("automatically broadcasts stock updates whenever dbStore.deductSkuStock is called", () => {
    const skus = dbStore.getAllSkus();
    const testSku = skus[0];
    const initialCases = testSku.stockCases;
    const vBefore = getStockVersion();

    let eventReceived = false;
    const unsubscribe = subscribeToStockUpdates((event) => {
      eventReceived = true;
      const found = event.skus.find((s) => s.id === testSku.id);
      expect(found).toBeDefined();
      expect(found!.stockCases).toBe(initialCases - 2);
    });

    const success = dbStore.deductSkuStock(testSku.id, 2);
    unsubscribe();

    expect(success).toBe(true);
    expect(dbStore.getSkuById(testSku.id)!.stockCases).toBe(initialCases - 2);
    expect(eventReceived).toBe(true);
    expect(getStockVersion()).toBeGreaterThan(vBefore);
  });

  it("strictly blocks negative inventory deduction (Rule [A9])", () => {
    const skus = dbStore.getAllSkus();
    const testSku = skus[0];
    const initialCases = testSku.stockCases;

    const success = dbStore.deductSkuStock(testSku.id, initialCases + 100);
    expect(success).toBe(false);
    expect(dbStore.getSkuById(testSku.id)!.stockCases).toBe(initialCases);
  });

  it("handles live-stock adaptive polling endpoint (/api/catalogue/live-stock?poll=true)", async () => {
    const currentVersion = getStockVersion();

    // 1. Polling with exact matching version -> changed: false
    const reqMatching = new NextRequest(
      `http://localhost:3000/api/catalogue/live-stock?poll=true&v=${currentVersion}`
    );
    const resMatching = await getLiveStock(reqMatching);
    const dataMatching = await resMatching.json();

    expect(dataMatching.success).toBe(true);
    expect(dataMatching.changed).toBe(false);
    expect(dataMatching.stockVersion).toBe(currentVersion);

    // 2. Trigger a stock mutation on warehouse
    const skus = dbStore.getAllSkus();
    dbStore.deductSkuStock(skus[0].id, 1);
    const newVersion = getStockVersion();
    expect(newVersion).toBeGreaterThan(currentVersion);

    // 3. Polling with stale version -> changed: true + full fresh SKU snapshot
    const reqStale = new NextRequest(
      `http://localhost:3000/api/catalogue/live-stock?poll=true&v=${currentVersion}`
    );
    const resStale = await getLiveStock(reqStale);
    const dataStale = await resStale.json();

    expect(dataStale.success).toBe(true);
    expect(dataStale.changed).toBe(true);
    expect(dataStale.stockVersion).toBe(newVersion);
    expect(Array.isArray(dataStale.skus)).toBe(true);

    const updatedItem = dataStale.skus.find((s: any) => s.id === skus[0].id);
    expect(updatedItem.stockCases).toBe(skus[0].stockCases);
  });

  it("simulates multiple retailers: Retailer A orders items to 0 stock, Retailer B immediately receives out-of-stock state", async () => {
    const skus = dbStore.getAllSkus();
    const targetSku = skus[0];
    const initialStock = targetSku.stockCases;

    // Retailer A checks out all remaining cases
    dbStore.deductSkuStock(targetSku.id, initialStock);
    expect(dbStore.getSkuById(targetSku.id)!.stockCases).toBe(0);

    // Retailer B queries live stock endpoint
    const req = new NextRequest("http://localhost:3000/api/catalogue/live-stock?poll=true");
    const res = await getLiveStock(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    const skuState = data.skus.find((s: any) => s.id === targetSku.id);
    expect(skuState).toBeDefined();
    expect(skuState.stockCases).toBe(0);

    // Retailer B attempting to deduct even 1 case is blocked atomically
    const retailerBAttempt = dbStore.deductSkuStock(targetSku.id, 1);
    expect(retailerBAttempt).toBe(false);
  });
});
