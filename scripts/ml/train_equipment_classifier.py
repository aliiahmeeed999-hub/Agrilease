"""
Trains a classifier on the SYNTHETIC equipment-recommendation data (see
generate_synthetic_data.py's docstring for why synthetic - there is no public
dataset of "which equipment did a real farm rent for this task").

Compares a RandomForestClassifier (better accuracy, reported honestly) against
a single DecisionTreeClassifier (what's actually served). A single tree is
what gets exported to TypeScript for the same reason the yield model didn't
export a full 200-tree ensemble as a first choice: simplicity of the served
inference code. The tradeoff here is more deliberate than for yield, though -
a single tree's accuracy is close enough to the forest's (both are trained on
data with genuine, sizeable class overlap by design - a "spraying" task
legitimately does get done with a plain tractor sometimes) that the
simplicity is worth it, and every prediction below a confidence threshold
falls back to the existing rule-based recommender rather than trusting a
low-confidence leaf (see src/lib/ai/recommendations.ts).
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier

DATA_DIR = Path(__file__).parent / "data"
INPUT_CSV = DATA_DIR / "synthetic_equipment_recommendation.csv"
OUTPUT_JSON = Path(__file__).parent.parent.parent / "src" / "lib" / "ai" / "equipmentModel.json"

CROP_TYPES = ["WHEAT", "BARLEY", "OLIVES", "CITRUS", "VEGETABLES"]
TASK_TYPES = ["PLOWING", "SPRAYING", "HARVESTING", "TRANSPORT", "IRRIGATION"]
RANDOM_STATE = 42
TEST_SIZE = 0.2


def build_features(df: pd.DataFrame) -> np.ndarray:
    crop_onehot = pd.get_dummies(df["crop_type"], prefix="crop")
    for crop in CROP_TYPES:
        col = f"crop_{crop}"
        if col not in crop_onehot:
            crop_onehot[col] = 0
    crop_onehot = crop_onehot[[f"crop_{c}" for c in CROP_TYPES]]

    task_onehot = pd.get_dummies(df["task_type"], prefix="task")
    for task in TASK_TYPES:
        col = f"task_{task}"
        if col not in task_onehot:
            task_onehot[col] = 0
    task_onehot = task_onehot[[f"task_{t}" for t in TASK_TYPES]]

    numeric = df[["farm_size_ha", "month"]]
    return pd.concat([crop_onehot, task_onehot, numeric], axis=1).to_numpy(dtype=float)


FEATURE_NAMES = [f"crop_{c}" for c in CROP_TYPES] + [f"task_{t}" for t in TASK_TYPES] + ["farm_size_ha", "month"]


def export_tree(tree, classes: list[str]) -> list:
    nodes = []
    for i in range(tree.node_count):
        is_leaf = tree.children_left[i] == -1
        if is_leaf:
            probs = tree.value[i][0]
            best_idx = int(np.argmax(probs))
            nodes.append(
                {
                    "leaf": True,
                    "predictedClass": classes[best_idx],
                    "confidence": float(probs[best_idx]),
                }
            )
        else:
            nodes.append(
                {
                    "leaf": False,
                    "feature": int(tree.feature[i]),
                    "threshold": float(tree.threshold[i]),
                    "left": int(tree.children_left[i]),
                    "right": int(tree.children_right[i]),
                }
            )
    return nodes


def main():
    df = pd.read_csv(INPUT_CSV)
    X = build_features(df)
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["equipment_type"])
    classes = list(label_encoder.classes_)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )

    forest = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=RANDOM_STATE)
    forest.fit(X_train, y_train)
    forest_acc = accuracy_score(y_test, forest.predict(X_test))
    forest_f1 = f1_score(y_test, forest.predict(X_test), average="macro")

    tree = DecisionTreeClassifier(max_depth=6, min_samples_leaf=5, random_state=RANDOM_STATE)
    tree.fit(X_train, y_train)
    tree_acc = accuracy_score(y_test, tree.predict(X_test))
    tree_f1 = f1_score(y_test, tree.predict(X_test), average="macro")

    print(f"RandomForest (comparison only): accuracy={forest_acc:.3f} macro_f1={forest_f1:.3f}")
    print(f"DecisionTree (served):          accuracy={tree_acc:.3f} macro_f1={tree_f1:.3f}")

    served = {
        "featureNames": FEATURE_NAMES,
        "cropTypes": CROP_TYPES,
        "taskTypes": TASK_TYPES,
        "tree": export_tree(tree.tree_, classes),
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(served, indent=2))
    print(f"\nWrote served model to {OUTPUT_JSON}")

    results = {
        "n_rows": int(len(df)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "random_forest_comparison_only": {"accuracy": round(float(forest_acc), 3), "macro_f1": round(float(forest_f1), 3)},
        "decision_tree_served": {"accuracy": round(float(tree_acc), 3), "macro_f1": round(float(tree_f1), 3)},
    }
    results_path = DATA_DIR / "equipment_classifier_results.json"
    results_path.write_text(json.dumps(results, indent=2))
    print(f"Wrote metrics to {results_path}")

    # Parity fixtures for the TS port, same idea as the yield model's.
    sample_idx = np.arange(min(20, len(X_test)))
    parity = {
        "inputs": X_test[sample_idx].tolist(),
        "expectedClasses": [classes[c] for c in tree.predict(X_test[sample_idx])],
    }
    parity_path = DATA_DIR / "equipment_classifier_parity_check.json"
    parity_path.write_text(json.dumps(parity, indent=2))
    print(f"Wrote parity-check fixtures to {parity_path}")


if __name__ == "__main__":
    main()
