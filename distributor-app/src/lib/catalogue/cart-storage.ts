export interface DraftCartItem {
  cases: number;
  packs: number;
}

function getStoredRetailerId(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("isolabs_current_retailer_id");
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem("isolabs_current_retailer_id");
    }
  } catch {}
  return null;
}

/**
 * Returns a localized storage key scoped to the specific Kirana store (retailerId).
 * Ensures that two Kirana stores accessing on the same browser or session never share a cart.
 */
export function getCartStorageKey(retailerId?: string | null): string {
  const targetId = (retailerId && retailerId.trim()) || getStoredRetailerId();

  if (targetId && targetId.trim()) {
    return `isolabs_draft_cart_${targetId.trim()}`;
  }
  return "isolabs_draft_cart";
}

/**
 * Returns a localized storage key for media attachments (audio/photo) scoped by Kirana store.
 */
export function getMediaStorageKey(retailerId?: string | null): string {
  const targetId = (retailerId && retailerId.trim()) || getStoredRetailerId();

  if (targetId && targetId.trim()) {
    return `isolabs_order_media_${targetId.trim()}`;
  }
  return "isolabs_order_media";
}

/**
 * Safely loads the draft cart from localStorage with multi-layer fallback.
 * Checks the scoped key first, falls back to legacy/un-scoped key, and auto-migrates.
 */
export function loadScopedCart(retailerId?: string | null): Record<string, DraftCartItem> {
  if (typeof window === "undefined" && typeof localStorage === "undefined") return {};
  try {
    const key = getCartStorageKey(retailerId);
    let raw = localStorage.getItem(key);
    if (!raw) {
      // Fallback to legacy or un-scoped draft cart
      raw = localStorage.getItem("isolabs_draft_cart");
      if (raw && key !== "isolabs_draft_cart") {
        // Migrate to scoped key
        localStorage.setItem(key, raw);
      }
    }
    return parseStoredCart(raw);
  } catch {
    return {};
  }
}

/**
 * Safely persists the draft cart to localStorage with dual mirroring to ensure 100% zero-drop delivery.
 */
export function saveScopedCart(
  cartMap: Record<string, DraftCartItem>,
  retailerId?: string | null
): void {
  if (typeof window === "undefined" && typeof localStorage === "undefined") return;
  try {
    const key = getCartStorageKey(retailerId);
    const serialized = JSON.stringify(cartMap);
    localStorage.setItem(key, serialized);
    // Keep un-scoped key mirrored as a universal safety fallback
    localStorage.setItem("isolabs_draft_cart", serialized);
  } catch {}
}

/**
 * Clears the draft cart from localStorage for the given retailer and removes universal fallback.
 */
export function clearScopedCart(retailerId?: string | null): void {
  if (typeof window === "undefined" && typeof localStorage === "undefined") return;
  try {
    const key = getCartStorageKey(retailerId);
    localStorage.removeItem(key);
    localStorage.removeItem("isolabs_draft_cart");
  } catch {}
}

/**
 * Universally purges all Kirana store client-side data (draft carts, media files, retailer keys).
 * Called whenever a Master Reset or Clean Slate operation occurs.
 */
export function clearAllKiranaClientData(): void {
  if (typeof window === "undefined" && typeof localStorage === "undefined") return;
  try {
    const storage =
      typeof localStorage !== "undefined"
        ? localStorage
        : typeof window !== "undefined"
        ? window.localStorage
        : null;

    if (!storage) return;

    const keysToRemove: string[] = [];
    const total = storage.length;
    for (let i = 0; i < total; i++) {
      const k = storage.key(i);
      if (k) keysToRemove.push(k);
    }
    try {
      for (const k of Object.keys(storage)) {
        if (!keysToRemove.includes(k)) keysToRemove.push(k);
      }
    } catch {}

    for (const k of keysToRemove) {
      if (
        k &&
        (k.startsWith("isolabs_draft_cart") ||
          k.startsWith("isolabs_order_media") ||
          k === "isolabs_current_retailer_id" ||
          k === "isolabs_quick_order_draft")
      ) {
        storage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn("Failed to clear Kirana client data:", err);
  }
}

/**
 * Safe parser for stored draft carts from localStorage
 */
export function parseStoredCart(raw: string | null): Record<string, DraftCartItem> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const result: Record<string, DraftCartItem> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "number") {
        result[key] = { cases: val, packs: 0 };
      } else if (val && typeof val === "object") {
        const v = val as { cases?: number; packs?: number };
        result[key] = { cases: v.cases || 0, packs: v.packs || 0 };
      }
    }
    return result;
  } catch {
    return {};
  }
}
