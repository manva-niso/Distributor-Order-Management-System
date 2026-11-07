import { dbStore } from "@/db/store";

export interface SkuStockSnapshot {
  id: string;
  code: string;
  stockCases: number;
  active: boolean;
}

export interface StockUpdateEvent {
  type: "STOCK_UPDATE" | "INITIAL_SYNC";
  stockVersion: number;
  timestamp: number;
  skus: SkuStockSnapshot[];
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
