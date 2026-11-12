import type { CropType } from "@/generated/prisma/enums";
import { fetchNasaPowerDaily } from "@/lib/nasaPower";
import type { IrrigationEstimate } from "@/types/irrigation";

const LOOKBACK_DAYS = 14;
const FETCH_TIMEOUT_MS = 15000;
const SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query";

// FAO-56 (Allen et al., 1998) Table 12 mid-season crop coefficients (Kc_mid) -
// one representative value per crop type rather than a full initial/mid/late
// growth-stage curve, since this app doesn't track a field's precise days-since
// growth-stage-transition. A real production version would interpolate Kc
// across Kc_ini/Kc_mid/Kc_end using CropCycle.plantedAt and Crop.growthDurationDays.
const FAO_KC_MID: Record<CropType, number> = {
  WHEAT: 1.15,
  BARLEY: 1.15,
  OLIVES: 0.65,
  CITRUS: 0.7,
  VEGETABLES: 1.05,
  OTHER: 0.85,
};

// Representative effective root-zone depth (mm) per crop type, used only to
// convert SoilGrids' volumetric water-content fractions into a millimeter
// water-holding-capacity figure - a simplification, not a per-field
// measurement (see FAO-56 Table 22 for typical ranges these are drawn from).
const ROOT_ZONE_DEPTH_MM: Record<CropType, number> = {
  WHEAT: 900,
  BARLEY: 900,
  OLIVES: 1200,
  CITRUS: 1200,
  VEGETABLES: 400,
  OTHER: 600,
};

// Rough share of rainfall assumed to be plant-available rather than lost to
// runoff/deep percolation - a widely used simplified figure, not the full
// USDA-SCS effective-rainfall method (which needs soil infiltration data this
// app doesn't have).
const EFFECTIVE_RAINFALL_FACTOR = 0.8;

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
}

// FAO-56 Equation 21-25: extraterrestrial radiation (Ra, MJ/m²/day) from
// latitude and day-of-year - standard solar-geometry astronomy, not an API call.
// Exported for direct unit testing of the formula (see tests/irrigation.test.ts).
export function extraterrestrialRadiation(latDeg: number, doy: number): number {
  const GSC = 0.0820; // solar constant, MJ m^-2 min^-1
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const omegaS = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * GSC * dr * (omegaS * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(omegaS));
}

// FAO-56 Equation 52 (Hargreaves-Samani, 1985) - the FAO-recommended reference
// evapotranspiration (ET0) formula for when wind/humidity/solar-radiation
// measurements aren't available, needing only Tmax/Tmin.
export function hargreavesEt0(tmaxC: number, tminC: number, latDeg: number, date: Date): number {
  const tmean = (tmaxC + tminC) / 2;
  const ra = extraterrestrialRadiation(latDeg, dayOfYear(date));
  return 0.0023 * ra * (tmean + 17.8) * Math.sqrt(Math.max(tmaxC - tminC, 0));
}

interface SoilGridsLayer {
  name: string;
  unit_measure: { d_factor: number };
  depths: { label: string; values: { mean: number | null } }[];
}

async function fetchWaterHoldingCapacityMm(lat: number, lng: number, rootZoneDepthMm: number): Promise<number | null> {
  const url = new URL(SOILGRIDS_URL);
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("lat", String(lat));
  url.searchParams.append("property", "wv0033"); // field capacity, volumetric water content
  url.searchParams.append("property", "wv1500"); // wilting point, volumetric water content
  url.searchParams.append("depth", "0-5cm");
  url.searchParams.append("depth", "15-30cm");
  url.searchParams.set("value", "mean");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    const layers: SoilGridsLayer[] = body.properties?.layers ?? [];

    function averagedPct(name: string): number | null {
      const layer = layers.find((l) => l.name === name);
      if (!layer) return null;
      const values = layer.depths.map((d) => d.values.mean).filter((v): v is number => v !== null);
      if (values.length === 0) return null;
      const avgRaw = values.reduce((sum, v) => sum + v, 0) / values.length;
      return avgRaw / layer.unit_measure.d_factor; // already numerically a percentage (target unit is 10^-2 cm3/cm3)
    }

    const fieldCapacityPct = averagedPct("wv0033");
    const wiltingPointPct = averagedPct("wv1500");
    if (fieldCapacityPct === null || wiltingPointPct === null) return null;

    const plantAvailableFraction = Math.max(0, (fieldCapacityPct - wiltingPointPct) / 100);
    return Number((plantAvailableFraction * rootZoneDepthMm).toFixed(1));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Not cached (see nasaPower.ts's comment) - recomputed whenever the irrigation
// panel is opened. Combines: NASA POWER daily Tmax/Tmin/rainfall (real,
// external), FAO-56 Hargreaves ET0 (real published formula), a per-crop FAO-56
// Kc_mid (real published table, simplified to one value per crop - see above),
// and SoilGrids field-capacity/wilting-point (real, external) for an
// informational water-holding-capacity figure. Returns null only if the NASA
// POWER call itself fails outright (soil data is optional/best-effort within).
export async function estimateIrrigationNeed(lat: number, lng: number, cropType: CropType): Promise<IrrigationEstimate | null> {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let daily;
  try {
    daily = await fetchNasaPowerDaily(lat, lng, start, end);
  } catch {
    return null;
  }

  let et0Total = 0;
  let rainTotal = 0;
  for (const day of daily) {
    if (day.tempMaxC !== null && day.tempMinC !== null) {
      et0Total += hargreavesEt0(day.tempMaxC, day.tempMinC, lat, new Date(day.date));
    }
    if (day.precipitationMm !== null) rainTotal += day.precipitationMm;
  }

  const kc = FAO_KC_MID[cropType];
  const etcTotal = et0Total * kc;
  const effectiveRainfall = rainTotal * EFFECTIVE_RAINFALL_FACTOR;
  const netNeed = Math.max(0, etcTotal - effectiveRainfall);

  const waterHoldingCapacityMm = await fetchWaterHoldingCapacityMm(lat, lng, ROOT_ZONE_DEPTH_MM[cropType]);

  return {
    cropType,
    windowDays: LOOKBACK_DAYS,
    et0TotalMm: Number(et0Total.toFixed(1)),
    etcTotalMm: Number(etcTotal.toFixed(1)),
    effectiveRainfallMm: Number(effectiveRainfall.toFixed(1)),
    netIrrigationNeedMm: Number(netNeed.toFixed(1)),
    soilWaterHoldingCapacityMm: waterHoldingCapacityMm,
    dataSource: "NASA POWER (T2M/PRECTOTCORR) + FAO-56 Hargreaves ET0 + SoilGrids water content",
  };
}
