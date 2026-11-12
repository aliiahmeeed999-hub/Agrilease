"""
Trains the equipment-demand forecast on the SYNTHETIC rental history (see
generate_synthetic_data.py). Deliberately simple, per the brief ("a moving
average is enough, don't over-engineer this one"): for each (equipment_type,
ISO week-of-year), the model is a MOVING AVERAGE across a +/-2-week window of
the mean rental count for those weeks across the training years - a smoothed
seasonal climatology, the same technique already used for weather normals in
this project's Open-Meteo/NASA POWER work, applied here to a synthetic demand
signal instead of real climate data.

The smoothing window matters and was added after evaluation, not by default:
an earlier version used the raw per-week mean with no smoothing, trained on
only 2 synthetic years. It scored WORSE than a naive no-seasonality baseline
on a held-out third year (RMSE 1.99 vs 1.53) - each crop's synthetic
harvest week is jittered by +/-2 weeks per year (real weather-driven timing
variation), so two training years' raw per-week average is too noisy to
capture a season, it just captures noise. Retrained with 5 training years
(more samples per week) AND a +/-2-week moving-average smoothing pass over
the seasonal table (matching the jitter window, so the smoothed estimate
reflects "elevated demand this season" rather than needing the exact week
right) - this is the version actually evaluated and served below.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

DATA_DIR = Path(__file__).parent / "data"
INPUT_CSV = DATA_DIR / "synthetic_rental_history.csv"
OUTPUT_JSON = Path(__file__).parent.parent.parent / "src" / "lib" / "ai" / "demandForecastModel.json"

SMOOTHING_WINDOW_WEEKS = 2  # +/- this many weeks, matching the generator's harvest-week jitter
EQUIPMENT_TYPES = ["TRACTOR", "HARVESTER", "SPRAYER", "PLOW", "TRAILER", "IRRIGATION_PUMP"]


def smoothed_weekly_means(train: pd.DataFrame, equipment_type: str) -> dict[int, float]:
    raw = train[train["equipment_type"] == equipment_type].groupby("iso_week")["rentals"].mean()
    raw = raw.reindex(range(1, 53), fill_value=raw.mean())

    smoothed = {}
    for week in range(1, 53):
        window_weeks = [((week - 1 + offset) % 52) + 1 for offset in range(-SMOOTHING_WINDOW_WEEKS, SMOOTHING_WINDOW_WEEKS + 1)]
        smoothed[week] = round(float(raw.loc[window_weeks].mean()), 3)
    return smoothed


def main():
    df = pd.read_csv(INPUT_CSV)
    test_year = int(df["year"].max())
    train = df[df["year"] < test_year]
    test = df[df["year"] == test_year]

    naive_mean = train.groupby("equipment_type")["rentals"].mean()
    seasonal_lookup = {equipment_type: smoothed_weekly_means(train, equipment_type) for equipment_type in EQUIPMENT_TYPES}

    # Evaluate both approaches on the held-out year.
    seasonal_preds, naive_preds, actuals = [], [], []
    for row in test.itertuples():
        seasonal_preds.append(seasonal_lookup[row.equipment_type].get(row.iso_week, naive_mean[row.equipment_type]))
        naive_preds.append(naive_mean[row.equipment_type])
        actuals.append(row.rentals)

    seasonal_rmse = float(np.sqrt(mean_squared_error(actuals, seasonal_preds)))
    seasonal_mae = float(mean_absolute_error(actuals, seasonal_preds))
    naive_rmse = float(np.sqrt(mean_squared_error(actuals, naive_preds)))
    naive_mae = float(mean_absolute_error(actuals, naive_preds))

    print(f"Seasonal (served) model on {test_year} held-out data: RMSE={seasonal_rmse:.3f} MAE={seasonal_mae:.3f}")
    print(f"Naive (no seasonality) baseline on the same data:     RMSE={naive_rmse:.3f} MAE={naive_mae:.3f}")

    served = {
        "trainedOnYears": sorted(train["year"].unique().tolist()),
        "weeklyMeanByEquipmentType": seasonal_lookup,
        "overallMeanByEquipmentType": {k: round(float(v), 3) for k, v in naive_mean.items()},
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(served, indent=2))
    print(f"\nWrote served model to {OUTPUT_JSON}")

    results = {
        "test_year": test_year,
        "seasonal_model": {"rmse": round(seasonal_rmse, 3), "mae": round(seasonal_mae, 3)},
        "naive_baseline": {"rmse": round(naive_rmse, 3), "mae": round(naive_mae, 3)},
    }
    results_path = DATA_DIR / "demand_forecast_results.json"
    results_path.write_text(json.dumps(results, indent=2))
    print(f"Wrote metrics to {results_path}")


if __name__ == "__main__":
    main()
