"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface SkuStockItem {
  id: string;
  code: string;
  stockCases: number;
  active: boolean;
}

export interface StockPayload {
  type: string;
  stockVersion: number;
  timestamp: number;
  skus: SkuStockItem[];
}

const BROADCAST_CHANNEL_NAME = "isolabs_warehouse_stock";

// Global cache so all components on the same page share 1 connection
let globalStockMap: Record<string, number> = {};
let globalStockVersion = 0;
const globalListeners = new Set<(stockMap: Record<string, number>, version: number) => void>();
let isInitialized = false;
let sseConnection: EventSource | null = null;
let broadcastChannel: BroadcastChannel | null = null;
let pollTimer: NodeJS.Timeout | null = null;

function notifyAll(skus: SkuStockItem[], version: number) {
  const newMap: Record<string, number> = { ...globalStockMap };
  for (const item of skus) {
    newMap[item.id] = item.stockCases;
    if (item.code) {
      newMap[item.code] = item.stockCases;
    }
  }
  globalStockMap = newMap;
  globalStockVersion = version;

  for (const listener of globalListeners) {
    try {
      listener(newMap, version);
    } catch (err) {
      console.warn("Stock listener error:", err);
    }
  }
}

export function broadcastLocalStockChange(skus: Array<{ id: string; stockCases: number }>) {
  if (typeof window === "undefined") return;

  const newMap = { ...globalStockMap };
  for (const s of skus) {
    newMap[s.id] = s.stockCases;
  }
  globalStockMap = newMap;
  globalStockVersion += 1;

  for (const listener of globalListeners) {
    listener(newMap, globalStockVersion);
  }

  try {
    if (!broadcastChannel && typeof BroadcastChannel !== "undefined") {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
    broadcastChannel?.postMessage({
      type: "STOCK_UPDATE",
      stockVersion: globalStockVersion,
      timestamp: Date.now(),
      skus,
    });
  } catch {}
}

function initLiveStockSync() {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  // 1. Cross-Tab Instant Sync via BroadcastChannel (0ms local latency)
  if (typeof BroadcastChannel !== "undefined") {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.skus) {
          notifyAll(event.data.skus, event.data.stockVersion || globalStockVersion + 1);
        }
      };
    } catch (err) {
      console.warn("BroadcastChannel not available:", err);
    }
  }

  // 2. Server-Sent Events (SSE) Network Stream
  if (typeof EventSource !== "undefined") {
    try {
      sseConnection = new EventSource("/api/catalogue/live-stock");

      sseConnection.onmessage = (event) => {
        try {
          const data: StockPayload = JSON.parse(event.data);
          if (data && Array.isArray(data.skus)) {
            notifyAll(data.skus, data.stockVersion || globalStockVersion + 1);
          }
        } catch {}
      };

      sseConnection.onerror = () => {
        // SSE will attempt auto-reconnect; fallback polling ensures zero gaps
      };
    } catch (err) {
      console.warn("SSE connection error:", err);
    }
  }

  // 3. Adaptive Fast Polling Fallback (runs every 2.5s)
  const pollStock = async () => {
    try {
      const res = await fetch(`/api/catalogue/live-stock?poll=true&v=${globalStockVersion}`);
      if (res.ok) {
        const data = await res.json();
        if (data.changed && Array.isArray(data.skus)) {
          notifyAll(data.skus, data.stockVersion);
        }
      }
    } catch {}
  };

  pollTimer = setInterval(pollStock, 2500);

  // Instant poll when window regains focus
  window.addEventListener("focus", pollStock);
}

export function useLiveStock() {
  const [stockMap, setStockMap] = useState<Record<string, number>>(globalStockMap);
  const [stockVersion, setStockVersion] = useState<number>(globalStockVersion);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [recentChanges, setRecentChanges] = useState<Set<string>>(new Set());
  const prevStockRef = useRef<Record<string, number>>(globalStockMap);

  useEffect(() => {
    initLiveStockSync();

    const listener = (newMap: Record<string, number>, version: number) => {
      // Discover which SKUs changed
      const changed = new Set<string>();
      for (const [id, cases] of Object.entries(newMap)) {
        if (prevStockRef.current[id] !== undefined && prevStockRef.current[id] !== cases) {
          changed.add(id);
        }
      }
      prevStockRef.current = newMap;
      if (changed.size > 0) {
        setRecentChanges(changed);
        setTimeout(() => {
          setRecentChanges((curr) => {
            const next = new Set(curr);
            for (const id of changed) next.delete(id);
            return next;
          });
        }, 4000);
      }

      setStockMap(newMap);
      setStockVersion(version);
      setLastUpdated(new Date());
    };

    globalListeners.add(listener);
    if (Object.keys(globalStockMap).length > 0) {
      setStockMap(globalStockMap);
    }

    return () => {
      globalListeners.delete(listener);
    };
  }, []);

  const getStock = useCallback(
    (skuId: string, fallbackCases: number = 0): number => {
      if (stockMap[skuId] !== undefined) {
        return stockMap[skuId];
      }
      return fallbackCases;
    },
    [stockMap]
  );

  const isOutOfStock = useCallback(
    (skuId: string, fallbackCases: number = 0): boolean => {
      const available = getStock(skuId, fallbackCases);
      return available <= 0;
    },
    [getStock]
  );

  return {
    stockMap,
    stockVersion,
    lastUpdated,
    recentChanges,
    getStock,
    isOutOfStock,
  };
}
