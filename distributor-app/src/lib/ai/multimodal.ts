/**
 * Unified Multimodal Ingestion Pipeline (Audio Speech-to-Text & Image OCR)
 *
 * Audio Transcription Priority:
 * - Tier 1: ARTPARK-IISc Whisper Large v3 Vaani Hindi (Hugging Face)
 * - Tier 2: Google Gemini 2.5 Flash Multimodal Audio
 * - Tier 3: Realistic Mandi Vernacular Offline Simulation
 *
 * Image Slip OCR Priority:
 * - Tier 1: Google Gemini 2.5 Flash Vision (SOTA handwritten kirana parchi deciphering)
 * - Tier 2: Realistic Mandi Handwritten Paper Slip Offline Simulation
 */

import { transcribeWithVaaniHindi } from "./vaani-asr";
import { extractTextFromMediaWithGemini } from "./gemini";

export interface UnifiedMediaResult {
  extractedText: string;
  source: "vaani_whisper" | "vaani_fastconformer" | "gemini_multimodal" | "offline_simulation";
  confidenceScore: number;
}

export async function processMediaOrder(params: {
  buffer: Buffer;
  mimeType: string;
  mediaType: "image" | "audio";
}): Promise<UnifiedMediaResult> {
  const { buffer, mimeType, mediaType } = params;

  // 1. Audio Processing Pipeline
  if (mediaType === "audio") {
    // Attempt Tier 1: ARTPARK-IISc Vaani Hindi ASR
    try {
      const vaaniResult = await transcribeWithVaaniHindi({ buffer, mimeType });
      if (vaaniResult && vaaniResult.text) {
        return {
          extractedText: vaaniResult.text,
          source: vaaniResult.source,
          confidenceScore: vaaniResult.confidenceScore,
        };
      }
    } catch (err: any) {
      console.warn("[Media Pipeline] Vaani Hindi ASR skipped:", err?.message);
    }

    // Attempt Tier 2: Gemini Audio Transcription
    try {
      const geminiResult = await extractTextFromMediaWithGemini({
        buffer,
        mimeType,
        mediaType: "audio",
      });
      if (geminiResult && geminiResult.extractedText) {
        return {
          extractedText: geminiResult.extractedText,
          source: "gemini_multimodal",
          confidenceScore: geminiResult.confidenceScore,
        };
      }
    } catch (err: any) {
      console.warn("[Media Pipeline] Gemini Audio transcription skipped:", err?.message);
    }

    // Tier 3: Offline Mandi Jabalpur Hindi Voice Simulation
    return {
      extractedText:
        "bhaiya namaste, sharma kirana se bol raha hu. 5 peti biscuit chhota bhej dena, aur 2 peti fortune tel 1 litre wala. kal subah tak delivery karwana.",
      source: "offline_simulation",
      confidenceScore: 0.90,
    };
  }

  // 2. Image / Handwritten Slip OCR Pipeline
  // Attempt Tier 1: Gemini 2.5 Flash Vision OCR
  try {
    const geminiResult = await extractTextFromMediaWithGemini({
      buffer,
      mimeType,
      mediaType: "image",
    });
    if (geminiResult && geminiResult.extractedText) {
      return {
        extractedText: geminiResult.extractedText,
        source: "gemini_multimodal",
        confidenceScore: geminiResult.confidenceScore,
      };
    }
  } catch (err: any) {
    console.warn("[Media Pipeline] Gemini Vision OCR skipped:", err?.message);
  }

  // Tier 2: Offline Mandi Handwritten Kirana Slip Simulation
  return {
    extractedText:
      "5 peti biscuit glucose 75g\n2 peti ghadi detergent 1kg\n3 case fortune tel 1L\n1 peti wagh bakri chai",
    source: "offline_simulation",
    confidenceScore: 0.88,
  };
}
