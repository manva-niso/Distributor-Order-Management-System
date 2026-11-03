import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const routeParam = searchParams.get("route") || undefined;

    const result = dbStore.getVanManifest(routeParam);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("Van manifest API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to generate van loading route manifest" },
      { status: 500 }
    );
  }
}
