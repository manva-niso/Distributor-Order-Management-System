import { describe, it, expect, beforeEach } from "vitest";
import {
  getCartStorageKey,
  getMediaStorageKey,
  parseStoredCart,
  loadScopedCart,
  saveScopedCart,
  clearScopedCart,
  DraftCartItem,
} from "../lib/catalogue/cart-storage";

describe("Cart Storage Scoping & Fallback Resilience (Rule [A50])", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    // Mock window and localStorage
    const storageMock = {
      getItem: (k: string) => (k in mockStorage ? mockStorage[k] : null),
      setItem: (k: string, v: string) => {
        mockStorage[k] = String(v);
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storageMock },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: storageMock,
      writable: true,
      configurable: true,
    });
  });

  it("calculates storage keys correctly for specific retailers", () => {
    expect(getCartStorageKey("RET-0001")).toBe("isolabs_draft_cart_RET-0001");
    expect(getMediaStorageKey("RET-0001")).toBe("isolabs_order_media_RET-0001");
  });

  it("falls back to cached isolabs_current_retailer_id if retailerId is omitted", () => {
    localStorage.setItem("isolabs_current_retailer_id", "RET-0002");
    expect(getCartStorageKey(null)).toBe("isolabs_draft_cart_RET-0002");
    expect(getMediaStorageKey(undefined)).toBe("isolabs_order_media_RET-0002");
  });

  it("falls back to isolabs_draft_cart if no retailer is known", () => {
    expect(getCartStorageKey(null)).toBe("isolabs_draft_cart");
    expect(getMediaStorageKey(null)).toBe("isolabs_order_media");
  });

  it("dual-writes to both scoped key and fallback key in saveScopedCart", () => {
    const cart: Record<string, DraftCartItem> = {
      "SKU-001": { cases: 3, packs: 0 },
      "SKU-002": { cases: 1, packs: 5 },
    };

    saveScopedCart(cart, "RET-0001");

    expect(localStorage.getItem("isolabs_draft_cart_RET-0001")).toContain("SKU-001");
    expect(localStorage.getItem("isolabs_draft_cart")).toContain("SKU-001");
  });

  it("loads from fallback key and auto-migrates if scoped key is empty (Quick Order to Cart pipeline)", () => {
    // Simulate user parsing order in Quick Order before retailerId loaded
    const quickOrderCart: Record<string, DraftCartItem> = {
      "SKU-005": { cases: 5, packs: 2 },
    };
    localStorage.setItem("isolabs_draft_cart", JSON.stringify(quickOrderCart));

    // Scoped key does not exist yet
    expect(localStorage.getItem("isolabs_draft_cart_RET-0001")).toBeNull();

    // User navigates to /cart which loads with data.retailer.id = "RET-0001"
    const loaded = loadScopedCart("RET-0001");

    // The cart MUST NOT be empty
    expect(loaded["SKU-005"]).toBeDefined();
    expect(loaded["SKU-005"].cases).toBe(5);
    expect(loaded["SKU-005"].packs).toBe(2);

    // Auto-migration should have mirrored it into the scoped key
    expect(localStorage.getItem("isolabs_draft_cart_RET-0001")).toBeDefined();
    expect(localStorage.getItem("isolabs_draft_cart_RET-0001")).toContain("SKU-005");
  });

  it("clearScopedCart wipes both scoped and fallback keys", () => {
    saveScopedCart({ "SKU-001": { cases: 2, packs: 0 } }, "RET-0001");
    expect(localStorage.getItem("isolabs_draft_cart_RET-0001")).not.toBeNull();
    expect(localStorage.getItem("isolabs_draft_cart")).not.toBeNull();

    clearScopedCart("RET-0001");

    expect(localStorage.getItem("isolabs_draft_cart_RET-0001")).toBeNull();
    expect(localStorage.getItem("isolabs_draft_cart")).toBeNull();
  });

  it("parses legacy numeric format and malformed JSON safely", () => {
    // Legacy format where values were just case numbers
    const legacy = JSON.stringify({ "SKU-001": 4, "SKU-002": 2 });
    const parsed = parseStoredCart(legacy);
    expect(parsed["SKU-001"]).toEqual({ cases: 4, packs: 0 });
    expect(parsed["SKU-002"]).toEqual({ cases: 2, packs: 0 });

    // Corrupt JSON
    expect(parseStoredCart("not a json string")).toEqual({});
    expect(parseStoredCart(null)).toEqual({});
  });
});
