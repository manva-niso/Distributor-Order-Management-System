/**
 * Gemini Multimodal Extraction Helper
 * Extracts line items from handwritten list photos and audio voice notes.
 */

export interface MediaExtractionResult {
  extractedText: string;
  confidenceScore: number;
}

export async function extractTextFromMediaWithGemini(params: {
  buffer: Buffer;
  mimeType: string;
  mediaType: "image" | "audio";
}): Promise<MediaExtractionResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null; // Gracefully fallback to simulated / offline OCR if no key is supplied
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const base64Data = params.buffer.toString("base64");

  const prompt =
    params.mediaType === "image"
      ? "You are an expert FMCG kirana slip reader. Read this handwritten grocery/kirana order list carefully. Output each requested item on a new line with quantity and unit (e.g. '5 peti biscuit 75g', '2 case fortune tel 1L'). If Hindi or Hinglish is written, preserve the exact item words. Output ONLY the extracted order text, no markdown preamble."
      : "You are an expert Indian FMCG order transcriptionist. Transcribe this Hindi or Hinglish voice note accurately into text. Output only the ordered items and quantities line by line.";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: params.mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Gemini API returned HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    const candidateText =
      json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (candidateText) {
      return {
        extractedText: candidateText,
        confidenceScore: 0.95,
      };
    }
  } catch (err) {
    console.warn("Gemini media extraction error:", err);
  }

  return null;
}
