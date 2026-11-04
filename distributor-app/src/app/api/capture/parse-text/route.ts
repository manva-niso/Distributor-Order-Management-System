import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseOrderText } from "@/lib/ai/pipeline";
import { dbStore } from "@/db/store";

const ParseTextSchema = z.object({
  text: z.string().min(1, "Order text is required"),
  retailerId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ParseTextSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid input text.",
        },
        { status: 400 }
      );
    }

    const { text, retailerId } = parseResult.data;

    // Load active retailer-specific learned aliases from DB (Tier 0 Feedback Loop)
    let retailerAliases: Record<string, string> | undefined = undefined;
    if (retailerId) {
      const stored = dbStore.getRetailerAliases(retailerId);
      if (stored && stored.length > 0) {
        retailerAliases = {};
        for (const a of stored) {
          retailerAliases[a.rawPhrase] = a.skuId;
        }
      }
    }

    const result = await parseOrderText(text, { retailerId, retailerAliases });

    return NextResponse.json({
      success: true,
      pipeline: result.pipelineName,
      totalLines: result.totalLines,
      ambiguousCount: result.ambiguousCount,
      lines: result.lines,
      rawText: result.rawText,
    });
  } catch (err: any) {
    console.error("Parse text route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to parse text order." },
      { status: 500 }
    );
  }
}
