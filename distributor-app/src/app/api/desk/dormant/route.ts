import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") || "14", 10);
    const days = isNaN(daysParam) ? 14 : Math.max(1, daysParam);

    const result = dbStore.getDormantRetailers(days);

    return NextResponse.json({
      success: true,
      inactivityThresholdDays: days,
      ...result,
    });
  } catch (err: any) {
    console.error("Dormant retailers API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to retrieve dormant retailers telemetry" },
      { status: 500 }
    );
  }
}
