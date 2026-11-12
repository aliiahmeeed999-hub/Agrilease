"""
Generates SYNTHETIC training data for the two models that have no real public
dataset to train on: equipment-task recommendation, and rental demand
forecasting. Every row here is generated, not observed - clearly labeled as
such in MODEL_CARD.md and in this docstring, unlike the yield model
(build_yield_dataset.py), which trains on real FAOSTAT + NASA POWER data.

The generative rules below encode real agronomic patterns (which equipment
type actually gets used for which task; when planting/harvest happens for
each crop) so the synthetic data is realistic rather than arbitrary, then add
randomized noise on top so it's a genuine (imperfectly separable)
classification/regression problem rather than a lookup table with extra
steps.

Usage: python scripts/ml/generate_synthetic_data.py
Outputs (committed to the repo - small, reproducible, not raw scraped data):
  scripts/ml/data/synthetic_equipment_recommendation.csv
  scripts/ml/data/synthetic_rental_history.csv
"""

import random
from pathlib import Path

import numpy as np
import pandas as pd
from faker import Faker

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)
fake = Faker()
Faker.seed(RANDOM_SEED)

DATA_DIR = Path(__file__).parent / "data"

CROP_TYPES = ["WHEAT", "BARLEY", "OLIVES", "CITRUS", "VEGETABLES"]
TASK_TYPES = ["PLOWING", "SPRAYING", "HARVESTING", "TRANSPORT", "IRRIGATION"]
EQUIPMENT_TYPES = ["TRACTOR", "HARVESTER", "SPRAYER", "PLOW", "TRAILER", "IRRIGATION_PUMP"]

# --- Equipment recommendation ------------------------------------------------

# For each (task_type, crop_type), the realistic equipment choice distribution.
# Olives deliberately differs from wheat/barley at harvest - olive harvest in
# practice is usually done with a tractor-mounted shaker/net, not a combine
# harvester the way cereal crops are, a genuine agronomic distinction (not
# arbitrary noise) baked into the generator on purpose.
def equipment_distribution(task_type: str, crop_type: str, farm_size_ha: float) -> dict:
    large_farm = farm_size_ha > 50

    if task_type == "PLOWING":
        return {"PLOW": 0.7, "TRACTOR": 0.3}
    if task_type == "SPRAYING":
        return {"SPRAYER": 0.75, "TRACTOR": 0.25}
    if task_type == "TRANSPORT":
        return {"TRAILER": 0.75, "TRACTOR": 0.25}
    if task_type == "IRRIGATION":
        return {"IRRIGATION_PUMP": 0.9, "TRACTOR": 0.1}
    if task_type == "HARVESTING":
        if crop_type in ("WHEAT", "BARLEY"):
            return {"HARVESTER": 0.85 if large_farm else 0.6, "TRACTOR": 0.15 if large_farm else 0.4}
        if crop_type == "OLIVES":
            return {"TRACTOR": 0.75, "HARVESTER": 0.25}
        # CITRUS/VEGETABLES: often hand-picked in practice, but when
        # mechanized, a trailer moves the harvest and a tractor powers
        # whatever picking aid is used - no dedicated combine involved.
        return {"TRACTOR": 0.55, "TRAILER": 0.45}
    raise ValueError(task_type)


def sample_equipment(task_type: str, crop_type: str, farm_size_ha: float) -> str:
    dist = equipment_distribution(task_type, crop_type, farm_size_ha)
    choices, weights = zip(*dist.items())
    return random.choices(choices, weights=weights, k=1)[0]


def generate_equipment_recommendation_data(n_rows: int = 800) -> pd.DataFrame:
    rows = []
    for _ in range(n_rows):
        crop_type = random.choice(CROP_TYPES)
        task_type = random.choice(TASK_TYPES)
        # Log-normal farm size - many smallholders, fewer large commercial farms.
        farm_size_ha = float(np.clip(np.random.lognormal(mean=2.2, sigma=1.0), 0.5, 500))
        month = random.randint(1, 12)
        equipment_type = sample_equipment(task_type, crop_type, farm_size_ha)
        rows.append(
            {
                "crop_type": crop_type,
                "task_type": task_type,
                "farm_size_ha": round(farm_size_ha, 1),
                "month": month,
                "equipment_type": equipment_type,
            }
        )
    return pd.DataFrame(rows)


# --- Demand forecast ----------------------------------------------------------

# ISO week-of-year offsets (relative to each crop's typical harvest week, itself
# randomized per synthetic season so the model isn't just memorizing one fixed
# calendar) where each equipment type sees elevated demand - the same shape of
# pattern as the rule-based forecast.ts this replaces, but now with amplitudes
# and noise estimated from many simulated seasons rather than hand-picked once.
CROP_HARVEST_WEEK = {"WHEAT": 26, "BARLEY": 24, "OLIVES": 46, "CITRUS": 48, "VEGETABLES": 30}
CROP_DEMAND_WINDOWS = {
    # offset_weeks_from_harvest: {equipment_type: relative_intensity}
    "WHEAT": {-5: {"SPRAYER": 1.0}, -1: {"HARVESTER": 1.0, "TRAILER": 0.6}, 0: {"HARVESTER": 1.0, "TRAILER": 0.6}},
    "BARLEY": {-5: {"SPRAYER": 0.9}, -1: {"HARVESTER": 0.9, "TRAILER": 0.5}, 0: {"HARVESTER": 0.9, "TRAILER": 0.5}},
    "OLIVES": {-6: {"PLOW": 0.4}, 0: {"TRACTOR": 1.0, "TRAILER": 0.5}, 1: {"TRACTOR": 0.6}},
    "CITRUS": {-4: {"SPRAYER": 0.6}, 0: {"TRAILER": 1.0, "TRACTOR": 0.4}},
    "VEGETABLES": {-3: {"SPRAYER": 0.7}, 0: {"TRAILER": 0.6}},
}
BASE_WEEKLY_RENTALS = 2.0  # background rental level with no seasonal effect


def generate_rental_history(n_years: int = 6) -> pd.DataFrame:
    rows = []
    for year in range(2023, 2023 + n_years):
        # Each synthetic "season" jitters the harvest week by +/-2 weeks (weather-
        # driven timing variation), so the model learns a *window* of elevated
        # demand rather than a single hard-coded week.
        harvest_week_this_year = {
            crop: CROP_HARVEST_WEEK[crop] + random.randint(-2, 2) for crop in CROP_TYPES
        }
        for week in range(1, 53):
            for equipment_type in EQUIPMENT_TYPES:
                intensity = 0.0
                for crop in CROP_TYPES:
                    offset = week - harvest_week_this_year[crop]
                    windows = CROP_DEMAND_WINDOWS[crop]
                    if offset in windows and equipment_type in windows[offset]:
                        intensity += windows[offset][equipment_type]
                lam = max(0.1, BASE_WEEKLY_RENTALS * (1 + intensity) + np.random.normal(0, 0.3))
                rentals = np.random.poisson(lam)
                rows.append(
                    {
                        "year": year,
                        "iso_week": week,
                        "equipment_type": equipment_type,
                        "rentals": int(rentals),
                        # A cosmetic Faker touch on a couple of sample rows only, so this
                        # stays obviously a numeric time series, not fabricated free text.
                        "sample_renter_name": fake.name() if random.random() < 0.02 else None,
                    }
                )
    return pd.DataFrame(rows)


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    equip_df = generate_equipment_recommendation_data()
    equip_path = DATA_DIR / "synthetic_equipment_recommendation.csv"
    equip_df.to_csv(equip_path, index=False)
    print(f"Wrote {len(equip_df)} synthetic equipment-recommendation rows to {equip_path}")
    print(equip_df["equipment_type"].value_counts())

    rental_df = generate_rental_history()
    rental_path = DATA_DIR / "synthetic_rental_history.csv"
    rental_df.to_csv(rental_path, index=False)
    print(f"\nWrote {len(rental_df)} synthetic rental-history rows to {rental_path}")


if __name__ == "__main__":
    main()
