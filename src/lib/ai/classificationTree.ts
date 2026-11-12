// A single-decision-tree classifier interpreter, the classification
// counterpart to gbm.ts's regression tree engine. Reproduces scikit-learn's
// DecisionTreeClassifier.predict()/.predict_proba() (the majority-class leaf
// and its probability) exactly - checked against sklearn's own output, see
// tests/equipment-classifier-parity.test.ts.

export interface ClassificationLeafNode {
  leaf: true;
  predictedClass: string;
  confidence: number;
}

export interface ClassificationSplitNode {
  leaf: false;
  feature: number;
  threshold: number;
  left: number;
  right: number;
}

export type ClassificationNode = ClassificationLeafNode | ClassificationSplitNode;

export interface ClassificationResult {
  predictedClass: string;
  confidence: number;
}

export function predictClassificationTree(tree: ClassificationNode[], features: number[]): ClassificationResult {
  let node = tree[0];
  let index = 0;
  while (!node.leaf) {
    index = features[node.feature] <= node.threshold ? node.left : node.right;
    node = tree[index];
  }
  return { predictedClass: node.predictedClass, confidence: node.confidence };
}
