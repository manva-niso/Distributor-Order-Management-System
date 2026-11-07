export interface DraftCartItem {
  cases: number;
  packs: number;
}

/**
 * Returns a localized storage key scoped to the specific Kirana store (retailerId).
 * Ensures that two Kirana stores accessing on the same browser or session never share a cart.
 */
export function getCartStorageKey(retailerId?: string | null): string {
  if (retailerId && retailerId.trim()) {
    return `isolabs_draft_cart_${retailerId.trim()}`;
  }
  return "isolabs_draft_cart";
}

/**
 * Returns a localized storage key for media attachments (audio/photo) scoped by Kirana store.
 */
export function getMediaStorageKey(retailerId?: string | null): string {
  if (retailerId && retailerId.trim()) {
    return `isolabs_order_media_${retailerId.trim()}`;
  }
  return "isolabs_order_media";
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
