/**
 * ARTPARK-IISc Vaani Hindi Automatic Speech Recognition (ASR) Module
 *
 * Integrated Models:
 * 1. Primary: ARTPARK-IISc/whisper-large-v3-vaani-hindi
 *    - OpenAI Whisper Large v3 fine-tuned on the ARTPARK-IISc Google Vaani Hindi corpus.
 *    - Captures 14,000+ hours of spoken vernacular dialects across 80+ Indian districts
 *      including Central India / Madhya Pradesh (Jabalpur Hindi, Bundelkhandi, Baghelkhandi).
 *    - Exceptional resilience to Mandi background noise, heavy accents, and Hinglish code-switching.
 * 2. High-Speed Edge Alternative: ARTPARK-IISc/Vaani-FastConformer-Hindi
 *    - NVIDIA NeMo FastConformer architecture optimized for low-latency streaming inference.
 *
 * References:
 * - https://huggingface.co/ARTPARK-IISc/whisper-large-v3-vaani-hindi
 * - https://huggingface.co/ARTPARK-IISc/Vaani-FastConformer-Hindi
 */

export interface VaaniAsrResult {
  text: string;
  source: "vaani_whisper" | "vaani_fastconformer" | "offline_simulation";
  confidenceScore: number;
}

/**
 * Transcribe vernacular Hindi / Hinglish audio using the ARTPARK-IISc Vaani models.
 * Calls the Hugging Face Inference API with an 8-second circuit-breaker timeout.
 */
export async function transcribeWithVaaniHindi(params: {
  buffer: Buffer;
  mimeType?: string;
}): Promise<VaaniAsrResult | null> {
  const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "";
  const primaryModel = process.env.VAANI_MODEL || "ARTPARK-IISc/whisper-large-v3-vaani-hindi";
  const fastConformerModel = "ARTPARK-IISc/Vaani-FastConformer-Hindi";

  // Endpoints to query in priority order
  const modelsToAttempt = [primaryModel, fastConformerModel];

  for (const model of modelsToAttempt) {
    const urls = [
      `https://api-inference.huggingface.co/models/${model}`,
      `https://router.huggingface.co/hf-inference/models/${model}`,
    ];

    for (const url of urls) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second circuit breaker for 3G phones

      try {
        const headers: Record<string, string> = {
          "Content-Type": params.mimeType || "audio/wav",
        };
        if (hfToken) {
          headers["Authorization"] = `Bearer ${hfToken}`;
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: new Uint8Array(params.buffer),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          // Hugging Face ASR endpoints return: { text: "..." }
          const transcribed = typeof data?.text === "string" ? data.text.trim() : "";
          if (transcribed.length > 0) {
            return {
              text: transcribed,
              source: model.includes("FastConformer")
                ? "vaani_fastconformer"
                : "vaani_whisper",
              confidenceScore: 0.94,
            };
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        // If aborted or failed, proceed to next endpoint or fallback
        if (err?.name !== "AbortError") {
          console.warn(`[Vaani ASR] Endpoint ${url} returned error:`, err?.message);
        }
      }
    }
  }

  return null;
}
