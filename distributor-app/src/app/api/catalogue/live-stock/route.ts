import { NextRequest, NextResponse } from "next/server";
import {
  getStockVersion,
  getLatestStockSnapshot,
  subscribeToStockUpdates,
  StockUpdateEvent,
} from "@/lib/catalogue/inventory-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const isPoll = url.searchParams.get("poll") === "true";
  const clientVersionStr = url.searchParams.get("v");
  const acceptsEventStream = request.headers.get("accept")?.includes("text/event-stream");

  // 1. Fast Adaptive Polling Mode
  if (isPoll || (clientVersionStr !== null && !acceptsEventStream)) {
    const clientVersion = parseInt(clientVersionStr || "0", 10);
    const currentVersion = getStockVersion();

    if (clientVersion > 0 && clientVersion === currentVersion) {
      return NextResponse.json({
        success: true,
        changed: false,
        stockVersion: currentVersion,
      });
    }

    const snapshot = getLatestStockSnapshot();
    return NextResponse.json({
      success: true,
      changed: true,
      stockVersion: snapshot.stockVersion,
      timestamp: snapshot.timestamp,
      skus: snapshot.skus,
    });
  }

  // 2. Server-Sent Events (SSE) Stream Mode
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state snapshot immediately upon connection
      const initialSnapshot = getLatestStockSnapshot();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialSnapshot)}\n\n`)
      );

      // Subscribe to real-time inventory broadcasts
      const unsubscribe = subscribeToStockUpdates((event: StockUpdateEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch (err) {
          console.warn("SSE stream write error:", err);
          cleanup?.();
        }
      });

      // Keep-alive heartbeat every 15s to prevent intermediate proxy timeout
      const pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup?.();
        }
      }, 15000);

      cleanup = () => {
        clearInterval(pingTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };

      request.signal.addEventListener("abort", () => {
        cleanup?.();
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
