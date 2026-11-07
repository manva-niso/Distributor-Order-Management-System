import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/db/store";
import { forceReleaseRetailerSession } from "@/lib/auth/session-lock";
import { getNeonSql, isNeonConfigured } from "@/db/neon";

const ForceLogoutSchema = z.object({
  phone: z.string().min(10, "Phone number required"),
  retailerId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ForceLogoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const cleanPhone = parseResult.data.phone.replace(/\D/g, "").slice(-10);
    let retailerId = parseResult.data.retailerId;

    if (!retailerId) {
      const user = dbStore.getUserByPhone(cleanPhone);
      retailerId = user?.retailerId;
      if (!retailerId) {
        const retailer = dbStore.getRetailerByPhone(cleanPhone);
        retailerId = retailer?.id;
      }
      if (!retailerId && isNeonConfigured()) {
        const sql = getNeonSql();
        if (sql) {
          try {
            const rows = (await sql`SELECT id FROM retailers WHERE phone = ${cleanPhone} LIMIT 1;`) as any[];
            if (rows && rows.length > 0) {
              retailerId = rows[0].id;
            }
          } catch {}
        }
      }
    }

    // Force release in-memory and in Neon by retailerId and by phone
    if (retailerId) {
      await forceReleaseRetailerSession(retailerId, cleanPhone);
    }

    // Direct wipe in Neon to eliminate any orphaned row created by deployed site or local
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        try {
          if (retailerId) {
            await sql`DELETE FROM active_sessions WHERE retailer_id = ${retailerId} OR phone = ${cleanPhone};`;
          } else {
            await sql`DELETE FROM active_sessions WHERE phone = ${cleanPhone};`;
          }
        } catch (dbErr) {
          console.warn("Direct Neon active_sessions purge warning:", dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "All previous sessions have been logged out successfully. You can now login.",
      retailerId,
      phone: cleanPhone,
    });
  } catch (err: any) {
    console.error("Force logout route error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to force logout sessions" },
      { status: 500 }
    );
  }
}
