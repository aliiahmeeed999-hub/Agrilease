import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { predictClassificationTree, type ClassificationNode } from "@/lib/ai/classificationTree";
import equipmentModel from "@/lib/ai/equipmentModel.json";

const parityPath = path.join(process.cwd(), "scripts", "ml", "data", "equipment_classifier_parity_check.json");
const parity: { inputs: number[][]; expectedClasses: string[] } = JSON.parse(readFileSync(parityPath, "utf8"));

describe("predictClassificationTree vs scikit-learn (exact parity)", () => {
  it("matches scikit-learn's DecisionTreeClassifier.predict() on held-out test rows", () => {
    const tree = equipmentModel.tree as unknown as ClassificationNode[];
    parity.inputs.forEach((features, i) => {
      const result = predictClassificationTree(tree, features);
      expect(result.predictedClass).toBe(parity.expectedClasses[i]);
    });
  });
});
