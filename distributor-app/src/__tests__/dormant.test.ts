import { describe, it, expect, beforeEach } from "vitest";
import { dbStore } from "@/db/store";

describe("Module 9 - 14-Day Dormant Retailers Retention Engine Suite", () => {
  beforeEach(() => {
    dbStore.reset(true);
  });

  describe("Inactivity & Churn Detection", () => {
    it("flags retailers with 14 or more days since last order (Rule [A23])", () => {
      const result = dbStore.getDormantRetailers(14);
      expect(result.totalRetailers).toBeGreaterThanOrEqual(6);
      expect(result.dormantCount).toBeGreaterThanOrEqual(2);

      // Verify all returned retailers meet threshold
      for (const retailer of result.dormantRetailers) {
        expect(retailer.daysInactive).toBeGreaterThanOrEqual(14);
      }
    });

    it("correctly stratifies churn risk levels between HIGH and CRITICAL", () => {
      const result = dbStore.getDormantRetailers(14);

      // RET-0006 (22 days inactive) or RET-0008 (28 days inactive) should be CRITICAL
      const criticalRetailers = result.dormantRetailers.filter(
        (r) => r.churnRisk === "CRITICAL"
      );
      expect(criticalRetailers.length).toBeGreaterThanOrEqual(1);

      for (const crit of criticalRetailers) {
        expect(crit.daysInactive).toBeGreaterThanOrEqual(21);
      }
    });

    it("calculates outstanding credit headroom and average order metrics", () => {
      const result = dbStore.getDormantRetailers(14);

      for (const retailer of result.dormantRetailers) {
        expect(retailer.creditLimit).toBeGreaterThan(0);
        expect(retailer.availableCredit).toBe(
          Math.max(0, retailer.creditLimit - retailer.currentBalance)
        );
        expect(retailer.avgOrderValue).toBeGreaterThan(0);
      }
    });

    it("generates a pre-filled Hindi WhatsApp re-order nudge with live schemes", () => {
      const result = dbStore.getDormantRetailers(14);
      const first = result.dormantRetailers[0];

      expect(first.activePromoTextHindi).toContain(`नमस्ते ${first.ownerName} जी!`);
      expect(first.activePromoTextHindi).toContain(first.name);
      expect(first.activePromoTextHindi).toContain(`${first.daysInactive} दिनों से आर्डर नहीं लगा`);
      expect(first.activePromoTextHindi).toContain("Parle-G");
      expect(first.activePromoTextHindi).toContain("10 पेटी पर 1 पेटी फ्री");

      // Verify WhatsApp URL
      expect(first.whatsappDeepLink).toContain(`https://wa.me/91${first.phone}?text=`);
    });
  });
});
