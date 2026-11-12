// A minimal gradient-boosted-tree inference engine: given a tree structure
// exported directly from a trained scikit-learn GradientBoostingRegressor
// (see scripts/ml/train_yield_model.py), reproduces its .predict() output
// exactly - checked node-for-node against sklearn's own output, not just
// "close enough" (see tests/gbm-parity.test.ts). No ONNX runtime or Python
// process needed at request time; this is the entire "runtime" the model
// needs.

export interface GbmLeafNode {
  leaf: true;
  value: number;
}

export interface GbmSplitNode {
  leaf: false;
  feature: number;
  threshold: number;
  left: number;
  right: number;
}

export type GbmNode = GbmLeafNode | GbmSplitNode;

export interface GbmModel {
  initialPrediction: number;
  learningRate: number;
  trees: GbmNode[][];
}

function predictTree(tree: GbmNode[], features: number[]): number {
  let node = tree[0];
  let index = 0;
  while (!node.leaf) {
    index = features[node.feature] <= node.threshold ? node.left : node.right;
    node = tree[index];
  }
  return node.value;
}

export function predictGbm(model: GbmModel, features: number[]): number {
  let total = model.initialPrediction;
  for (const tree of model.trees) {
    total += model.learningRate * predictTree(tree, features);
  }
  return total;
}
