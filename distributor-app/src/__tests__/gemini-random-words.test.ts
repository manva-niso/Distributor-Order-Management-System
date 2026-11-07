import { describe, it, expect } from "vitest";
import { parseOrderText } from "../lib/ai/pipeline";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
try {
  const envPath = path.resolve(__dirname, "../../.env.local");
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

describe("Gemini Fallback & Random Words Resolution", () => {
  it("uses Gemini to intelligently resolve colloquial biscuit request", async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Skipping test: No GEMINI_API_KEY");
      return;
    }

    const res = await parseOrderText("5 peti butter biscuit");
    console.log("butter biscuit result:", JSON.stringify(res, null, 2));

    expect(res.success).toBe(true);
    expect(res.lines.length).toBe(1);
    const line = res.lines[0];
    expect(line.matchedSku).not.toBeNull();
    // Good Day Butter Cookies (SKU-BS-GD120)
    expect(line.matchedSku?.id).toBe("SKU-BS-GD120");
    expect(line.reasoning).toBeDefined();
    expect(line.source).toBe("gemini");
  }, 30000);

  it("uses Gemini to explain and reject out-of-catalog request: '10 packet chips'", async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Skipping test: No GEMINI_API_KEY");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));

    const res = await parseOrderText("10 packet chips");
    console.log("10 packet chips result:", JSON.stringify(res, null, 2));

    expect(res.success).toBe(true);
    expect(res.lines.length).toBe(1);
    const line = res.lines[0];
    expect(line.matchedSku).toBeNull(); // Honestly rejected, never falsely matches cookies
    expect(line.reasoning).toBeDefined();
    expect(line.reasoning?.toLowerCase()).toContain("chips");
  }, 30000);

  it("uses Gemini to handle completely random gibberish: 'asdfghjk xyz 123'", async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Skipping test: No GEMINI_API_KEY");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));

    const res = await parseOrderText("asdfghjk xyz 123");
    console.log("asdfghjk result:", JSON.stringify(res, null, 2));

    expect(res.success).toBe(true);
    expect(res.lines.length).toBe(1);
    const line = res.lines[0];
    expect(line.matchedSku).toBeNull();
    expect(line.reasoning).toBeDefined();
  }, 30000);
});
