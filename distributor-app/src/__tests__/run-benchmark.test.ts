import { describe, it, expect } from "vitest";
import { runThreeWayBenchmark } from "../lib/ai/ml/three_way_benchmark";

describe("3-Way Benchmark Execution", () => {
  it("runs full comparative benchmark across all 444 queries and verifies metrics", () => {
    const results = runThreeWayBenchmark();
    expect(results).toBeDefined();
    expect(results.metrics_e1.totalQueries).toBe(444);
    expect(results.metrics_e2.totalQueries).toBe(444);
    expect(results.metrics_e3.totalQueries).toBe(444);
    expect(results.metrics_e3.autoConfirmPrecisionPct).toBe(100.0);
    expect(results.metrics_e3.autoConfirmErrors).toBe(0);
  }, 35000);
});
