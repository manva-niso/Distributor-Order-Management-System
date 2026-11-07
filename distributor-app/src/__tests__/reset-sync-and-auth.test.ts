import { describe, it, expect, beforeEach } from "vitest";
import { dbStore } from "../db/store";
import { verifyOtp, createAndSendOtp } from "../lib/auth/otp";
import { clearAllKiranaClientData, loadScopedCart, saveScopedCart } from "../lib/catalogue/cart-storage";
import { broadcastDatabaseReset, broadcastCatalogSync, getStockVersion } from "../lib/catalogue/inventory-events";

describe("Master Reset, Cross-Tab Kirana Sync & OTP Reliability Suite", () => {
  beforeEach(() => {
    dbStore.reset(false);
  });

  describe("Master Reset & Kirana Client Data Purge", () => {
    it("purges all Kirana scoped carts and media from client storage", () => {
      // Mock localStorage in node environment
      const mockStorage: Record<string, string> = {
        isolabs_draft_cart_RET_0001: JSON.stringify({ "SKU-BS-075": { cases: 5, packs: 0 } }),
        isolabs_draft_cart_RET_0002: JSON.stringify({ "SKU-BS-GD120": { cases: 2, packs: 0 } }),
        isolabs_draft_cart: JSON.stringify({ "SKU-BS-075": { cases: 5, packs: 0 } }),
        isolabs_order_media_RET_0001: JSON.stringify({ audio: "dummy.mp3" }),
        isolabs_current_retailer_id: "RET-0001",
        isolabs_lang: "hi", // Non-cart setting should be preserved
      };

      const originalLocalStorage = globalThis.localStorage;
      const originalWindow = (globalThis as any).window;
      const storageMock = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        key: (idx: number) => Object.keys(mockStorage)[idx] || null,
        get length() {
          return Object.keys(mockStorage).length;
        },
        clear: () => {
          for (const k of Object.keys(mockStorage)) delete mockStorage[k];
        },
      } as any;

      globalThis.localStorage = storageMock;
      (globalThis as any).window = { localStorage: storageMock };

      try {
        clearAllKiranaClientData();

        expect(mockStorage.isolabs_draft_cart_RET_0001).toBeUndefined();
        expect(mockStorage.isolabs_draft_cart_RET_0002).toBeUndefined();
        expect(mockStorage.isolabs_draft_cart).toBeUndefined();
        expect(mockStorage.isolabs_order_media_RET_0001).toBeUndefined();
        expect(mockStorage.isolabs_current_retailer_id).toBeUndefined();
        // Language preference should NOT be purged
        expect(mockStorage.isolabs_lang).toBe("hi");
      } finally {
        globalThis.localStorage = originalLocalStorage;
        (globalThis as any).window = originalWindow;
      }
    });

    it("broadcasts system-wide DATABASE_RESET event with updated version", () => {
      const vBefore = getStockVersion();
      const event = broadcastDatabaseReset("clean_slate");

      expect(event.type).toBe("DATABASE_RESET");
      expect(event.stockVersion).toBeGreaterThan(vBefore);
      expect(event.skus.length).toBeGreaterThan(0);
    });

    it("broadcasts CATALOG_SYNC event on custom Excel catalog upload", () => {
      const event = broadcastCatalogSync();

      expect(event.type).toBe("CATALOG_SYNC");
      expect(event.stockVersion).toBeDefined();
    });

    it("resets store to absolute zero with 0 SKUs and 0 Retailers", () => {
      dbStore.resetToAbsoluteZero();

      expect(dbStore.getAllSkus().length).toBe(0);
      expect(dbStore.getAllRetailers().length).toBe(0);
      expect(dbStore.getAllOrders().length).toBe(0);
      // Desk clerk must remain so administrative setup is accessible
      expect(dbStore.getUserById("USR-DESK-1")).toBeDefined();
    });
  });

  describe("Dev Sandbox Master OTP Reliability", () => {
    it("accepts master code 123456 directly even when no prior OTP request exists", async () => {
      // Clear all active OTPs to simulate cold start / post-reset state
      (dbStore as any).otps.clear();

      const verifyRes = await verifyOtp("9826000001", "123456");
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.phone).toBe("9826000001");
      expect(verifyRes.user?.role).toBe("retailer");
    });

    it("accepts master code 716716 directly even when no prior OTP request exists", async () => {
      (dbStore as any).otps.clear();

      const verifyRes = await verifyOtp("9826000099", "716716");
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.role).toBe("desk");
    });

    it("rejects invalid non-master OTP when no OTP was issued", async () => {
      (dbStore as any).otps.clear();

      const verifyRes = await verifyOtp("9826000001", "888888");
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.error).toContain("No active OTP request");
    });
  });
});
