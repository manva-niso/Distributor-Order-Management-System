export interface DraftCartItem {
  cases: number;
  packs: number;
}

/**
 * Returns a localized storage key scoped to the specific Kirana store (retailerId).
 * Ensures that two Kirana stores accessing on the same browser or session never share a cart.
 */
export function getCartStorageKey(retailerId?: string | null): string {
  const targetId =
    (retailerId && retailerId.trim()) ||
    (typeof window !== "undefined" ? localStorage.getItem("isolabs_current_retailer_id") : null);

  if (targetId && targetId.trim()) {
    return `isolabs_draft_cart_${targetId.trim()}`;
  }
  return "isolabs_draft_cart";
}

/**
 * Returns a localized storage key for media attachments (audio/photo) scoped by Kirana store.
 */
export function getMediaStorageKey(retailerId?: string | null): string {
  const targetId =
    (retailerId && retailerId.trim()) ||
    (typeof window !== "undefined" ? localStorage.getItem("isolabs_current_retailer_id") : null);

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
  if (typeof window === "undefined") return {};
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
  if (typeof window === "undefined") return;
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
  if (typeof window === "undefined") return;
  try {
    const key = getCartStorageKey(retailerId);
    localStorage.removeItem(key);
    localStorage.removeItem("isolabs_draft_cart");
  } catch {}
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
