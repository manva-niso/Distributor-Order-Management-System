import { OrderParserPipeline, ParseResult, ParserContext } from "./types";
import { deterministicTextParser } from "./text-parser";
import { cascadedOrderParser } from "./cascaded-parser";

/**
 * Custom Machine Learning Adapter
 * Allows plugging in a local Python / FastAPI / PyTorch microservice (e.g. spaCy, BERT, fine-tuned LLM)
 */
export class CustomMlApiAdapter implements OrderParserPipeline {
  public name = "custom_ml_microservice";

  public async parseText(rawText: string, context?: ParserContext): Promise<ParseResult> {
    const mlApiUrl = process.env.CUSTOM_ML_API_URL || "http://localhost:8000/api/predict";

    try {
      const res = await fetch(mlApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, context }),
      });

      if (!res.ok) {
        throw new Error(`Custom ML microservice returned HTTP ${res.status}`);
      }

      const data: ParseResult = await res.json();
      return data;
    } catch (err: any) {
      console.warn(`[Custom ML Pipeline Warning] Endpoint ${mlApiUrl} failed: ${err?.message}. Gracefully falling back to deterministic rules.`);
      // Graceful Tier 3 Fallback (Rule [A17]): Zero-crash fallback to deterministic rules
      return deterministicTextParser.parseText(rawText, context);
    }
  }
}

/**
 * Pipeline Factory: Selects the active parsing engine based on environment configuration
 * Environment: ORDER_PARSER_PROVIDER="rules" | "cascade" | "custom_ml"
 */
export function getActiveParserPipeline(): OrderParserPipeline {
  const provider = (process.env.ORDER_PARSER_PROVIDER || "rules").toLowerCase();

  switch (provider) {
    case "custom_ml":
      return new CustomMlApiAdapter();
    case "cascade":
    case "adaptive":
      return cascadedOrderParser;
    case "rules":
    default:
      return deterministicTextParser;
  }
}

/**
 * Main parseOrderText dispatcher
 */
export async function parseOrderText(rawText: string, context?: ParserContext): Promise<ParseResult> {
  const pipeline = getActiveParserPipeline();
  return pipeline.parseText(rawText, context);
}
