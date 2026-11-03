import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseOrderText } from "@/lib/ai/pipeline";

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
    const result = await parseOrderText(text, { retailerId });

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
