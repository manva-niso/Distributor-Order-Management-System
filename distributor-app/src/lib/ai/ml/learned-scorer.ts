import weightsData from "./data/model_weights.json";
import { FeatureVector, featureExtractor, FeatureExtractionInput, FEATURE_NAMES } from "./feature-extractor";

export type ScorerDecision = "AUTO_CONFIRM" | "SUGGEST_TOP2" | "ASK_UNIT" | "DESK_CONFIRM";

export const LOOK_ALIKE_FAMILY_SKUS = new Set([
  "SKU-BS-PG075",
  "SKU-BS-PG250",
  "SKU-BS-GD120",
  "SKU-BS-MG250",
  "SKU-DT-GH500",
  "SKU-DT-GH1KG",
  "SKU-DT-CK250",
  "SKU-DT-SE1KG",
  "SKU-DT-WH1KG",
  "SKU-DT-RN250",
  "SKU-FD-MG070",
  "SKU-FD-MG140",
  "SKU-FD-YP065",
  "SKU-OL-FT1L",
  "SKU-OL-FT15T",
  "SKU-OL-KG1L",
  "SKU-OL-MK1L",
  "SKU-PC-DT075",
  "SKU-PC-DT125",
  "SKU-PC-LB100",
  "SKU-PC-LX100",
]);

export interface LearnedScorerPrediction {
  rawLogit: number;
  rawProb: number;
  calibratedProb: number;
  autoConfirm: boolean;
  decision: ScorerDecision;
  decisionReason: string;
  isAmbiguousUnit: boolean;
  isQuantityAnomaly: boolean;
  threshold: number;
  latencyMs: number;
}

export class LearnedScorer {
  private readonly coefficients: number[];
  private readonly intercept: number;
  private readonly plattA: number;
  private readonly plattB: number;
  public readonly threshold: number;

  constructor() {
    this.coefficients = weightsData.baseWeights.coefficients;
    this.intercept = weightsData.baseWeights.intercept;
    this.plattA = weightsData.plattCalibration.A;
    this.plattB = weightsData.plattCalibration.B;
    this.threshold = weightsData.decision.threshold;
  }

  /**
   * Evaluates raw numeric feature array [12] directly.
   * Target execution latency: < 0.02ms (pure vector dot product + sigmoid).
   */
  public scoreVector(features: number[]): { rawLogit: number; rawProb: number; calibratedProb: number } {
    let dot = this.intercept;
    for (let i = 0; i < this.coefficients.length; i++) {
      dot += this.coefficients[i] * features[i];
    }

    const rawProb = 1.0 / (1.0 + Math.exp(-dot));
    const calibratedProb = 1.0 / (1.0 + Math.exp(-(this.plattA * dot + this.plattB)));

    return {
      rawLogit: dot,
      rawProb,
      calibratedProb,
    };
  }

  /**
   * End-to-end evaluation from high-level extraction input.
   * Strictly enforces:
   * 1. Hard Invariant: Items with ambiguous units (DABBA, UNKNOWN) NEVER auto-confirm.
   * 2. Wilson 95% LCB threshold gating for >= 99% auto-confirm precision.
   */
  public predict(input: FeatureExtractionInput): LearnedScorerPrediction {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const { vector, array } = featureExtractor.extract(input);
    const { rawLogit, rawProb, calibratedProb } = this.scoreVector(array);
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const latencyMs = Math.round((t1 - t0) * 1000) / 1000;

    const isAmbiguousUnit = vector.is_ambiguous_unit === 1;
    const isQuantityAnomaly = vector.quantity_anomaly === 1;

    // Hard Invariant [A16]: Ambiguous packaging units (DABBA or UNKNOWN) can NEVER auto-confirm!
    if (isAmbiguousUnit) {
      return {
        rawLogit,
        rawProb,
        calibratedProb,
        autoConfirm: false,
        decision: "ASK_UNIT",
        decisionReason: "Ambiguous unit detected (Dabba/Pouch). Must prompt user or desk to confirm packaging unit.",
        isAmbiguousUnit: true,
        isQuantityAnomaly,
        threshold: this.threshold,
        latencyMs,
      };
    }

    // Segmented Adaptive Threshold:
    // Look-alike size families require strict tau_family (0.945); single-SKU brands are safe at 0.75
    const isFamilySku = LOOK_ALIKE_FAMILY_SKUS.has(input.candidateSku.id);
    const effectiveThreshold = isFamilySku ? this.threshold : 0.75;

    // High confidence above calibrated threshold -> Safe for 99% precision auto-confirm into cart
    if (calibratedProb >= effectiveThreshold) {
      return {
        rawLogit,
        rawProb,
        calibratedProb,
        autoConfirm: true,
        decision: "AUTO_CONFIRM",
        decisionReason: isFamilySku
          ? `High calibrated confidence for family SKU (${(calibratedProb * 100).toFixed(1)}% >= ${(effectiveThreshold * 100).toFixed(1)}% with 95% LCB).`
          : `High calibrated confidence for single-SKU brand (${(calibratedProb * 100).toFixed(1)}% >= ${(effectiveThreshold * 100).toFixed(1)}%).`,
        isAmbiguousUnit: false,
        isQuantityAnomaly,
        threshold: effectiveThreshold,
        latencyMs,
      };
    }

    // Moderate confidence -> Present top-2 alternatives to user
    if (calibratedProb >= 0.50) {
      return {
        rawLogit,
        rawProb,
        calibratedProb,
        autoConfirm: false,
        decision: "SUGGEST_TOP2",
        decisionReason: `Moderate confidence (${(calibratedProb * 100).toFixed(1)}%). Presenting top alternatives for 1-tap confirmation.`,
        isAmbiguousUnit: false,
        isQuantityAnomaly,
        threshold: this.threshold,
        latencyMs,
      };
    }

    // Low confidence -> Route to desk / manual lookup
    return {
      rawLogit,
      rawProb,
      calibratedProb,
      autoConfirm: false,
      decision: "DESK_CONFIRM",
      decisionReason: `Low confidence (${(calibratedProb * 100).toFixed(1)}% < 50%). Flagged for manual desk confirmation.`,
      isAmbiguousUnit: false,
      isQuantityAnomaly,
      threshold: this.threshold,
      latencyMs,
    };
  }
}

export const learnedScorer = new LearnedScorer();
