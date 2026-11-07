import { NextRequest, NextResponse } from "next/server";
import { uploadMediaToS3, isS3Configured } from "@/lib/storage/s3";
import { processMediaOrder } from "@/lib/ai/multimodal";
import { parseOrderText } from "@/lib/ai/pipeline";
import { dbStore } from "@/db/store";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mediaType = (formData.get("mediaType") as string) || "image";
    const retailerId = (formData.get("retailerId") as string) || undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalName = file.name || "upload";
    const mimeType = file.type || (mediaType === "image" ? "image/jpeg" : "audio/webm");

    // 1. Generate unique file key for S3
    const timestamp = Date.now();
    const cleanFilename = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const s3Key = `orders/${retailerId || "guest"}/${timestamp}_${cleanFilename}`;

    let signedUrl = "";
    if (isS3Configured()) {
      try {
        const uploadResult = await uploadMediaToS3({
          buffer,
          key: s3Key,
          contentType: mimeType,
          metadata: {
            retailerId: retailerId || "unknown",
            mediaType,
            uploadedAt: new Date().toISOString(),
          },
        });
        signedUrl = uploadResult.signedUrl;
      } catch (s3Err: any) {
        console.warn("S3 upload failed, falling back to local object preview:", s3Err?.message);
      }
    }

    // 2. Extract Text via Multimodal Pipeline (Vaani Hindi ASR / Gemini Vision OCR / Offline Fallback)
    const mediaResult = await processMediaOrder({
      buffer,
      mimeType,
      mediaType: mediaType as "image" | "audio",
    });

    const extractedText = mediaResult.extractedText;

    // 3. Run extracted text through our universal FMCG deterministic parser
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

    const parseResult = await parseOrderText(extractedText, { retailerId, retailerAliases });

    return NextResponse.json({
      success: true,
      mediaUrl: signedUrl,
      mediaKey: s3Key,
      mediaType,
      mediaSource: mediaResult.source,
      fileName: originalName,
      fileSize: file.size,
      rawText: extractedText,
      totalLines: parseResult.totalLines,
      ambiguousCount: parseResult.ambiguousCount,
      lines: parseResult.lines,
      pipeline: parseResult.pipelineName,
    });
  } catch (err: any) {
    console.error("Media upload route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process media upload." },
      { status: 500 }
    );
  }
}
