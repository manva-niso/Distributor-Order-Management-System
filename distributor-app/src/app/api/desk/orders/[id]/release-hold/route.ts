import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { z } from "zod";

const ReleaseHoldSchema = z.object({
  expectedOccVersion: z.number().int().positive().optional(),
  authorizedBy: z.string().default("Sunil Clerk"),
  approvalNote: z.string().default("Customer promised cash payment on van delivery"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = ReleaseHoldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { expectedOccVersion, authorizedBy, approvalNote } = parsed.data;

    const result = dbStore.releaseCreditHold(
      id,
      expectedOccVersion,
      authorizedBy,
      approvalNote
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, conflict: result.conflict },
        { status: result.conflict ? 409 : 400 }
      );
    }

    // Persist verified status update to Neon PostgreSQL
    try {
      const { syncOrderStatusToNeon } = await import("@/db/neon-sync");
      syncOrderStatusToNeon(id, "VERIFIED", result.order?.occVersion || 2).catch((err) =>
        console.warn("Neon release-hold status sync warning:", err)
      );
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Credit hold on order #${id} released successfully.`,
      order: result.order,
    });
  } catch (err: any) {
    console.error("Release credit hold error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to release credit hold" },
      { status: 500 }
    );
  }
}
