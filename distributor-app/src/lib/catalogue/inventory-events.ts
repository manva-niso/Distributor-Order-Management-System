import { dbStore } from "@/db/store";

export interface SkuStockSnapshot {
  id: string;
  code: string;
  stockCases: number;
  active: boolean;
}

export interface StockUpdateEvent {
  type: "STOCK_UPDATE" | "INITIAL_SYNC" | "DATABASE_RESET" | "CATALOG_SYNC";
  stockVersion: number;
  timestamp: number;
  skus: SkuStockSnapshot[];
  mode?: string;
}

type StockListener = (event: StockUpdateEvent) => void;

// Global persistent state across module reloads in Node / Next.js
declare global {
  // eslint-disable-next-line no-var
  var __isolabs_stock_version: number | undefined;
  // eslint-disable-next-line no-var
  var __isolabs_stock_listeners: Set<StockListener> | undefined;
  // eslint-disable-next-line no-var
  var __isolabs_stock_hook_registered: boolean | undefined;
}

if (globalThis.__isolabs_stock_version === undefined) {
  globalThis.__isolabs_stock_version = 1;
}

if (globalThis.__isolabs_stock_listeners === undefined) {
  globalThis.__isolabs_stock_listeners = new Set<StockListener>();
}

if (!globalThis.__isolabs_stock_hook_registered) {
  globalThis.__isolabs_stock_hook_registered = true;
  dbStore.onStockChange(() => {
    broadcastStockUpdate();
  });
}

export function getStockVersion(): number {
  return globalThis.__isolabs_stock_version ?? 1;
}

export function getLatestStockSnapshot(): StockUpdateEvent {
  const skus = dbStore.getAllSkus().map((s) => ({
    id: s.id,
    code: s.code,
    stockCases: s.stockCases,
    active: s.active,
  }));

  return {
    type: "INITIAL_SYNC",
    stockVersion: getStockVersion(),
    timestamp: Date.now(),
    skus,
  };
}

export function subscribeToStockUpdates(listener: StockListener): () => void {
  const listeners = globalThis.__isolabs_stock_listeners!;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastStockUpdate(
  updatedSkus?: SkuStockSnapshot[]
): StockUpdateEvent {
  globalThis.__isolabs_stock_version = (globalThis.__isolabs_stock_version ?? 1) + 1;
  const currentVersion = globalThis.__isolabs_stock_version;

  const skus =
    updatedSkus ||
    dbStore.getAllSkus().map((s) => ({
      id: s.id,
      code: s.code,
      stockCases: s.stockCases,
      active: s.active,
    }));

  const event: StockUpdateEvent = {
    type: "STOCK_UPDATE",
    stockVersion: currentVersion,
    timestamp: Date.now(),
    skus,
  };

  const listeners = globalThis.__isolabs_stock_listeners!;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      console.warn("Stock listener execution error:", err);
    }
  }

  return event;
}

/**
 * Broadcasts a system-wide database reset event to all connected clients.
 * Instructs Kirana store clients and Order Desk clients to immediately purge
 * local draft carts and re-synchronize inventory state.
 */
export function broadcastDatabaseReset(mode: string = "clean_slate"): StockUpdateEvent {
  globalThis.__isolabs_stock_version = (globalThis.__isolabs_stock_version ?? 1) + 1;
  const currentVersion = globalThis.__isolabs_stock_version;

  const skus = dbStore.getAllSkus().map((s) => ({
    id: s.id,
    code: s.code,
    stockCases: s.stockCases,
    active: s.active,
  }));

  const event: StockUpdateEvent = {
    type: "DATABASE_RESET",
    stockVersion: currentVersion,
    timestamp: Date.now(),
    skus,
    mode,
  };

  const listeners = globalThis.__isolabs_stock_listeners!;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      console.warn("Reset listener execution error:", err);
    }
  }

  return event;
}

/**
 * Broadcasts when wholesale catalogue structure is replaced or updated via Excel import.
 */
export function broadcastCatalogSync(): StockUpdateEvent {
  globalThis.__isolabs_stock_version = (globalThis.__isolabs_stock_version ?? 1) + 1;
  const currentVersion = globalThis.__isolabs_stock_version;

  const skus = dbStore.getAllSkus().map((s) => ({
    id: s.id,
    code: s.code,
    stockCases: s.stockCases,
    active: s.active,
  }));

  const event: StockUpdateEvent = {
    type: "CATALOG_SYNC",
    stockVersion: currentVersion,
    timestamp: Date.now(),
    skus,
  };

  const listeners = globalThis.__isolabs_stock_listeners!;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      console.warn("Catalog sync listener execution error:", err);
    }
  }

  return event;
}
