import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { predictGbm, type GbmModel } from "@/lib/ai/gbm";
import yieldModel from "@/lib/ai/yieldModel.json";

// Fixtures generated directly by scripts/ml/train_yield_model.py alongside the
// model itself: real held-out test rows + scikit-learn's own .predict() output
// for those rows. This is the actual correctness check for the hand-written
// TS tree-traversal engine - not a hand-derived expected value, but sklearn's.
const parityPath = path.join(process.cwd(), "scripts", "ml", "data", "gbm_parity_check.json");
const parityFixtures: Record<string, { inputs: number[][]; expectedPredictions: number[] }> = JSON.parse(
  readFileSync(parityPath, "utf8")
);

describe("predictGbm vs scikit-learn (exact parity)", () => {
  for (const [cropType, fixture] of Object.entries(parityFixtures)) {
    it(`matches scikit-learn's GradientBoostingRegressor.predict() for ${cropType}`, () => {
      const model = yieldModel.crops[cropType as keyof typeof yieldModel.crops] as unknown as GbmModel;
      fixture.inputs.forEach((features, i) => {
        const predicted = predictGbm(model, features);
        // scikit-learn's own output, rounded to 6 decimals when exported -
        // a tight tolerance confirms this is the same computation, not just
        // a similar one.
        expect(predicted).toBeCloseTo(fixture.expectedPredictions[i], 3);
      });
    });
  }
});
