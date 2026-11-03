import { describe, it, expect, beforeEach } from "vitest";
import { dbStore } from "@/db/store";

describe("Module 8 - Van Loading Route Manifest Engine Suite", () => {
  beforeEach(() => {
    dbStore.reset();
  });

  describe("Route Manifest Aggregation", () => {
    it("discovers available delivery routes from confirmed orders and retailer master", () => {
      const { availableRoutes, selectedRoute } = dbStore.getVanManifest();
      expect(availableRoutes.length).toBeGreaterThan(0);
      expect(availableRoutes).toContain("Napier Town Route #4");
      expect(selectedRoute).toBeDefined();
    });

    it("aggregates total master cases by SKU including promotional free goods (Rule [A22])", () => {
      const { manifest } = dbStore.getVanManifest("Napier Town Route #4");
      expect(manifest.route).toBe("Napier Town Route #4");
      expect(manifest.vanNumber).toContain("Van 04");
      expect(manifest.totalOrders).toBeGreaterThanOrEqual(1);
      expect(manifest.totalMasterCases).toBeGreaterThan(0);

      // Verify Pick List Items
      expect(manifest.pickList.length).toBeGreaterThan(0);
      for (const item of manifest.pickList) {
        expect(item.skuId).toBeDefined();
        expect(item.skuName).toBeDefined();
        expect(item.totalCases).toBe(item.paidCases + item.freeCases);
        expect(item.totalPacks).toBe(item.totalCases * item.unitsPerCase);
        expect(item.approxWeightKg).toBeGreaterThan(0);
      }
    });

    it("builds an ordered sequence of delivery stops with driver delivery instructions", () => {
      const { manifest } = dbStore.getVanManifest("Napier Town Route #4");
      expect(manifest.stops.length).toBe(manifest.totalOrders);

      const firstStop = manifest.stops[0];
      expect(firstStop.stopNumber).toBe(1);
      expect(firstStop.retailerName).toBeDefined();
      expect(firstStop.phone).toBeDefined();
      expect(firstStop.address).toBeDefined();
      expect(firstStop.paymentMode).toMatch(/CREDIT|CASH_ON_DELIVERY/);
      expect(firstStop.totalCases).toBeGreaterThan(0);
      expect(firstStop.lines.length).toBeGreaterThan(0);
    });

    it("calculates approximate vehicle load weight for warehouse picking", () => {
      const { manifest } = dbStore.getVanManifest("Napier Town Route #4");
      expect(manifest.approxTotalWeightKg).toBeGreaterThan(0);
      const computedWeight = manifest.pickList.reduce((acc, p) => acc + p.approxWeightKg, 0);
      expect(manifest.approxTotalWeightKg).toBeCloseTo(computedWeight, 1);
    });
  });
});
