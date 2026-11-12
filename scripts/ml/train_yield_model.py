"""
Trains the crop-yield model on scripts/ml/data/yield_training_data.csv (real
FAOSTAT yields + real NASA POWER climate - see build_yield_dataset.py).

Design decision made while building this (documented here and in
MODEL_CARD.md): FAOSTAT's "area harvested" is a COUNTRY-level aggregate
(millions of hectares for large producers) and isn't a meaningful predictor
of a single field's per-hectare yield rate - a farmer's 5ha field isn't
comparable to "Morocco planted 2M ha of wheat this year." It was tried and
dropped; the model predicts yield (kg/ha) from crop type, average
temperature, and total precipitation only - the same two climate features
this app already has live/historical access to via Open-Meteo/NASA POWER
(Phase 2), which is what actually lets this model run at inference time.

Trains ONE model PER crop type (rather than one pooled model with crop-type
dummies) since yield scales differ by an order of magnitude between crops
(e.g. vegetables ~20,000 kg/ha vs wheat ~2,000 kg/ha) and this app always
knows a field's crop type up front, making per-crop models both simpler to
reason about and a more natural match for how the model is actually served.

For each crop, trains and evaluates both a plain linear regression and a
gradient-boosted regressor on a held-out 20% test split. The linear model's
R^2 turned out to be very weak (as low as 0.02, even negative for olives) -
international cross-country yield differences are driven far more by
irrigation, inputs, and farming technology than by climate alone, which two
climate features can't capture. The gradient-boosted model fits meaningfully
better (R^2 0.3-0.66) and is the one actually SERVED: its tree structure
(every split feature/threshold/child-node/leaf-value, plus the learning rate
and initial prediction) is exported to JSON, and re-implemented as a plain
tree-traversal function in TypeScript (see src/lib/ai/gbm.ts) - no ONNX
runtime or Python process needed at request time. The exported JS port's
predictions were checked against scikit-learn's own .predict() output on the
held-out test rows for exact parity before being trusted (see
scripts/ml/verify_gbm_parity.py). Both models' full metrics are still written
to training_results.json so the (weaker) linear alternative stays visible
for comparison, not hidden.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

DATA_DIR = Path(__file__).parent / "data"
INPUT_CSV = DATA_DIR / "yield_training_data.csv"
OUTPUT_JSON = Path(__file__).parent.parent.parent / "src" / "lib" / "ai" / "yieldModel.json"

FEATURES = ["avg_temp_c", "total_precip_mm"]
RANDOM_STATE = 42
TEST_SIZE = 0.2


def export_tree(tree) -> list:
    """One entry per node: leaves have value + no children; internal nodes have
    feature/threshold/children. Mirrors sklearn's Tree layout exactly (see
    verify_gbm_parity.py) rather than a simplified/re-derived structure.

    Deliberately NOT rounded: threshold controls which branch a feature value
    takes, so rounding it can flip a comparison for a value that legitimately
    sits between the true (float64) threshold and a rounded one - this was a
    real bug caught by the parity check (1 row out of 20 mismatched per crop
    until this was fixed), not a hypothetical concern.
    """
    nodes = []
    for i in range(tree.node_count):
        is_leaf = tree.children_left[i] == -1
        if is_leaf:
            nodes.append({"leaf": True, "value": float(tree.value[i][0][0])})
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


def train_crop(df: pd.DataFrame, crop_type: str) -> tuple[dict, dict]:
    subset = df[df["crop_type"] == crop_type]
    X = subset[FEATURES].to_numpy()
    y = subset["yield_kg_ha"].to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE)

    linear = LinearRegression()
    linear.fit(X_train, y_train)
    linear_pred = linear.predict(X_test)

    gbm = GradientBoostingRegressor(random_state=RANDOM_STATE, n_estimators=200, max_depth=3, learning_rate=0.05)
    gbm.fit(X_train, y_train)
    gbm_pred = gbm.predict(X_test)

    def metrics(y_true, y_pred):
        return {
            "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 1),
            "mae": round(float(mean_absolute_error(y_true, y_pred)), 1),
            "r2": round(float(r2_score(y_true, y_pred)), 3),
        }

    result = {
        "crop_type": crop_type,
        "n_rows": int(len(subset)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "linear": {
            "intercept": round(float(linear.intercept_), 2),
            "coefficients": {name: round(float(coef), 4) for name, coef in zip(FEATURES, linear.coef_)},
            "test_metrics": metrics(y_test, linear_pred),
        },
        "gbm": {
            "test_metrics": metrics(y_test, gbm_pred),
        },
        "yield_kg_ha_mean_in_data": round(float(y.mean()), 1),
    }

    served = {
        "initialPrediction": float(gbm.init_.constant_[0][0]),
        "learningRate": gbm.learning_rate,
        "trees": [export_tree(estimator[0].tree_) for estimator in gbm.estimators_],
    }

    # Sample test rows + sklearn's own predictions, kept in a separate file
    # (not shipped to the app) so the TS port can be checked for exact
    # parity without needing Python at verification time.
    sample_idx = np.arange(min(20, len(X_test)))
    parity_check = {
        "inputs": X_test[sample_idx].tolist(),
        "expectedPredictions": gbm_pred[sample_idx].round(6).tolist(),
    }

    return result, served, parity_check


def main():
    df = pd.read_csv(INPUT_CSV)
    crop_types = sorted(df["crop_type"].unique())

    all_results = {}
    all_served = {}
    all_parity = {}
    for crop_type in crop_types:
        print(f"Training {crop_type}...")
        result, served, parity_check = train_crop(df, crop_type)
        all_results[crop_type] = result
        all_served[crop_type] = served
        all_parity[crop_type] = parity_check
        print(
            f"  linear:  RMSE={result['linear']['test_metrics']['rmse']} "
            f"MAE={result['linear']['test_metrics']['mae']} R2={result['linear']['test_metrics']['r2']}"
        )
        print(
            f"  gbm:     RMSE={result['gbm']['test_metrics']['rmse']} "
            f"MAE={result['gbm']['test_metrics']['mae']} R2={result['gbm']['test_metrics']['r2']}"
        )

    # What actually ships to the TypeScript app: per-crop GBM tree structure.
    served_model = {
        "features": FEATURES,
        "trainedAt": pd.Timestamp.utcnow().isoformat(),
        "crops": all_served,
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(served_model, indent=2))
    print(f"\nWrote served model parameters to {OUTPUT_JSON}")

    # Full comparison (both models, all metrics) for MODEL_CARD.md.
    metrics_path = Path(__file__).parent / "data" / "training_results.json"
    metrics_path.write_text(json.dumps(all_results, indent=2))
    print(f"Wrote full training results to {metrics_path}")

    parity_path = Path(__file__).parent / "data" / "gbm_parity_check.json"
    parity_path.write_text(json.dumps(all_parity, indent=2))
    print(f"Wrote parity-check fixtures to {parity_path}")


if __name__ == "__main__":
    main()
