import { describe, it, expect } from "vitest";
import { GeminiClosedSetChooser, CandidateSkuSummary } from "../ai/gemini-chooser";
import * as fs from "fs";
import * as path from "path";

// Load GEMINI_API_KEY from distributor-app/.env.local if not in process.env
try {
  const envPath = path.resolve(__dirname, "../../../distributor-app/.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = val.trim();
        }
      }
    });
  }
} catch {}

describe("Live Gemini API Verification", () => {
  const candidates: CandidateSkuSummary[] = [
    {
      id: "SKU-BS-PG075",
      name: "Parle-G 75g",
      brand: "Parle",
      category: "Biscuits",
      packSize: "75g",
    },
    {
      id: "SKU-BS-GD120",
      name: "Britannia Good Day Butter 120g",
      brand: "Britannia",
      category: "Biscuits",
      packSize: "120g",
    },
    {
      id: "SKU-DT-GH1KG",
      name: "Ghadi Detergent Powder 1kg",
      brand: "Ghadi",
      category: "Detergent",
      packSize: "1kg",
    },
  ];

  it("authenticates and accurately selects candidate from closed set using live key", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Skipping live test: No GEMINI_API_KEY found");
      return;
    }

    const chooser = new GeminiClosedSetChooser({
      apiKey,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      timeoutMs: 8000,
    });

    const result = await chooser.choose("5 peti pila wala glucose biscuit", candidates);

    console.log("Live Gemini result:", result);
    expect(result.source).toBe("gemini");
    expect(result.chosenSkuId).toBe("SKU-BS-PG075");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  }, 15000);
});
