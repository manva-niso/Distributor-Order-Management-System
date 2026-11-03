import { NextResponse } from "next/server";
import { dbStore } from "@/db/store";

export async function GET() {
  try {
    const stats = dbStore.getDeskStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load desk stats" },
      { status: 500 }
    );
  }
}
