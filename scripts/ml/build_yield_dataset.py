"""
Builds a real, non-synthetic training dataset for the crop-yield model.

Sources (both real, both free, both cited in MODEL_CARD.md):
  - FAOSTAT "Production: Crops and livestock products" bulk dataset
    (https://www.fao.org/faostat/en/#data/QCL) - yield (kg/ha) and area
    harvested (ha) by country/crop/year. Downloaded once via:
      curl -o data/faostat_raw.zip https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data.zip
    then unzipped into data/ (not committed - see README below).
  - NASA POWER monthly climate API (https://power.larc.nasa.gov/) - real
    historical temperature and precipitation for each country's representative
    farmland coordinate, for the same years as the FAOSTAT rows. One API call
    per country (the monthly endpoint accepts a multi-year range in a single
    request), not per country-year - this is what keeps this a ~20-request
    job instead of a many-hundreds-request one.

This script does NOT invent data: every (country, year, crop) row's yield
comes directly from FAOSTAT, and every climate feature comes directly from
NASA POWER for that exact country and year (not a long-term climate normal).

Usage:
    python scripts/ml/build_yield_dataset.py
Requires Production_Crops_Livestock_E_All_Data_NOFLAG.csv to already be
present in scripts/ml/data/ (see README.md in this folder for the download
command - the raw FAOSTAT CSV is ~90MB and is not committed to the repo).
"""

import json
import time
import urllib.request
import urllib.error
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
FAOSTAT_CSV = DATA_DIR / "Production_Crops_Livestock_E_All_Data_NOFLAG.csv"
OUTPUT_CSV = DATA_DIR / "yield_training_data.csv"
CLIMATE_CACHE = DATA_DIR / "climate_cache.json"

START_YEAR = 2000
END_YEAR = 2023

# FAOSTAT Item name -> this app's CropType enum. "OTHER" is intentionally
# excluded - it's a catch-all in the app with no single representative crop,
# so it isn't trained on and falls back to a documented default (see
# src/lib/ai/yield.ts and MODEL_CARD.md).
CROP_ITEM_MAP = {
    "Wheat": "WHEAT",
    "Barley": "BARLEY",
    "Olives": "OLIVES",
    "Citrus Fruit, Total": "CITRUS",
    "Vegetables Primary": "VEGETABLES",
}

# FAOSTAT Area Code -> a representative farmland coordinate (not the capital
# city) used to fetch that country's real historical climate. Chosen for
# geographic/climatic diversity across the crops above, not statistical
# sampling rigor - documented as a simplification in MODEL_CARD.md.
COUNTRIES = {
    143: ("Morocco", 33.5, -7.0),
    203: ("Spain", 40.0, -3.7),
    68: ("France", 46.6, 2.3),
    106: ("Italy", 42.5, 12.5),
    84: ("Greece", 39.0, 22.0),
    59: ("Egypt", 26.8, 30.8),
    222: ("Tunisia", 34.0, 9.5),
    4: ("Algeria", 36.5, 4.5),
    231: ("United States of America", 39.0, -98.0),
    100: ("India", 22.0, 79.0),
    10: ("Australia", -31.0, 117.0),
    9: ("Argentina", -34.0, -64.0),
    33: ("Canada", 52.0, -106.0),
    185: ("Russian Federation", 55.0, 40.0),
    41: ("China, mainland", 34.0, 113.0),
    21: ("Brazil", -20.0, -48.0),
    202: ("South Africa", -29.0, 24.0),
}

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def fetch_country_climate(lat: float, lng: float) -> dict:
    """One NASA POWER call per country, covering START_YEAR-END_YEAR, returns
    {year: {"avg_temp_c": ..., "total_precip_mm": ...}}."""
    url = (
        "https://power.larc.nasa.gov/api/temporal/monthly/point"
        f"?parameters=T2M,PRECTOTCORR&community=AG&longitude={lng}&latitude={lat}"
        f"&start={START_YEAR}&end={END_YEAR}&format=JSON"
    )
    with urllib.request.urlopen(url, timeout=30) as resp:
        body = json.loads(resp.read())

    params = body["properties"]["parameter"]
    t2m = params["T2M"]
    precip = params["PRECTOTCORR"]

    by_year = {}
    for year in range(START_YEAR, END_YEAR + 1):
        monthly_temps = []
        total_precip = 0.0
        for month in range(1, 13):
            key = f"{year}{month:02d}"
            if key in t2m and t2m[key] != -999:
                monthly_temps.append(t2m[key])
            if key in precip and precip[key] != -999:
                total_precip += precip[key] * DAYS_IN_MONTH[month - 1]
        if monthly_temps:
            by_year[year] = {
                "avg_temp_c": round(sum(monthly_temps) / len(monthly_temps), 2),
                "total_precip_mm": round(total_precip, 1),
            }
    return by_year


def load_climate_cache() -> dict:
    if CLIMATE_CACHE.exists():
        return json.loads(CLIMATE_CACHE.read_text())
    return {}


def save_climate_cache(cache: dict) -> None:
    CLIMATE_CACHE.write_text(json.dumps(cache))


def main():
    if not FAOSTAT_CSV.exists():
        raise SystemExit(
            f"Missing {FAOSTAT_CSV}. Download the FAOSTAT bulk dataset first - see the "
            "docstring at the top of this file for the exact command."
        )

    print("Loading FAOSTAT data...")
    df = pd.read_csv(
        FAOSTAT_CSV,
        encoding="latin-1",
        usecols=["Area Code", "Area", "Item", "Element", "Unit"] + [f"Y{y}" for y in range(START_YEAR, END_YEAR + 1)],
    )

    climate_cache = load_climate_cache()
    rows = []

    for area_code, (country_name, lat, lng) in COUNTRIES.items():
        cache_key = str(area_code)
        if cache_key in climate_cache:
            climate_by_year = climate_cache[cache_key]
            climate_by_year = {int(k): v for k, v in climate_by_year.items()}
        else:
            print(f"Fetching NASA POWER climate for {country_name}...")
            try:
                climate_by_year = fetch_country_climate(lat, lng)
            except (urllib.error.URLError, TimeoutError, KeyError) as e:
                print(f"  skipped {country_name}: {e}")
                continue
            climate_cache[cache_key] = climate_by_year
            save_climate_cache(climate_cache)
            time.sleep(1)  # be polite to a free public API

        area_yield = df[(df["Area Code"] == area_code) & (df["Element"] == "Yield")]
        area_harvested = df[(df["Area Code"] == area_code) & (df["Element"] == "Area harvested")]

        for item_name, crop_type in CROP_ITEM_MAP.items():
            yield_row = area_yield[area_yield["Item"] == item_name]
            area_row = area_harvested[area_harvested["Item"] == item_name]
            if yield_row.empty:
                continue
            yield_row = yield_row.iloc[0]
            area_row = area_row.iloc[0] if not area_row.empty else None

            for year in range(START_YEAR, END_YEAR + 1):
                if year not in climate_by_year:
                    continue
                y_col = f"Y{year}"
                yield_val = yield_row.get(y_col)
                if pd.isna(yield_val) or yield_val <= 0:
                    continue
                area_val = area_row.get(y_col) if area_row is not None else None
                if area_val is None or pd.isna(area_val) or area_val <= 0:
                    continue

                rows.append(
                    {
                        "crop_type": crop_type,
                        "country": country_name,
                        "year": year,
                        "area_harvested_ha": area_val,
                        "avg_temp_c": climate_by_year[year]["avg_temp_c"],
                        "total_precip_mm": climate_by_year[year]["total_precip_mm"],
                        "yield_kg_ha": yield_val,
                    }
                )

    out = pd.DataFrame(rows)
    out.to_csv(OUTPUT_CSV, index=False)
    print(f"Wrote {len(out)} rows to {OUTPUT_CSV}")
    print(out.groupby("crop_type").size())


if __name__ == "__main__":
    main()
