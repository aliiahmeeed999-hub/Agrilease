import type { CropType, FieldStatus } from "@/generated/prisma/enums";
import type { YieldConfidence, YieldPrediction } from "@/types/ai";
import { hashInRange } from "@/lib/ai/hash";
import { fetchNasaPowerDaily } from "@/lib/nasaPower";
import { predictGbm, type GbmModel } from "@/lib/ai/gbm";
import yieldModelData from "@/lib/ai/yieldModel.json";

const yieldModel = yieldModelData as unknown as { crops: Record<string, GbmModel> };

// A fixed placeholder, not a trained prediction - OTHER is a catch-all crop
// type with no single representative FAOSTAT item to train on (see
// scripts/ml/train_yield_model.py and MODEL_CARD.md).
const FALLBACK_BASE_YIELD_KG_HA: Record<CropType, number> = {
  WHEAT: 3400,
  BARLEY: 2900,
  OLIVES: 2100,
  CITRUS: 21000,
  VEGETABLES: 17000,
  OTHER: 4000,
};

const CLIMATE_LOOKBACK_DAYS = 365;

export interface YieldFieldInput {
  id: string;
  name: string;
  cropType: CropType;
  areaHectares: number;
  status: FieldStatus;
  expectedHarvestAt: Date | null;
  latitude: number;
  longitude: number;
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function confidenceLevelFor(field: YieldFieldInput, daysToHarvest: number | null): YieldConfidence {
  if (field.status === "HARVESTED") return "HIGH";
  if (daysToHarvest === null) return "MEDIUM";
  if (daysToHarvest < 30) return "HIGH";
  if (daysToHarvest <= 60) return "MEDIUM";
  return "LOW";
}

// The model was trained on ANNUAL average temperature and ANNUAL total
// precipitation (see build_yield_dataset.py) - fetching the trailing 365 days
// of real NASA POWER data and aggregating the same way keeps train/serve
// features consistent, rather than substituting a different notion of
// "weather" (e.g. today's forecast) that the model was never trained on.
async function recentClimateForField(lat: number, lng: number): Promise<{ avgTempC: number; totalPrecipMm: number } | null> {
  const end = new Date();
  const start = new Date(end.getTime() - CLIMATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  try {
    const daily = await fetchNasaPowerDaily(lat, lng, start, end);
    const temps = daily.map((d) => d.tempAvgC).filter((v): v is number => v !== null);
    const precips = daily.map((d) => d.precipitationMm).filter((v): v is number => v !== null);
    if (temps.length === 0 || precips.length === 0) return null;

    return {
      avgTempC: temps.reduce((sum, v) => sum + v, 0) / temps.length,
      totalPrecipMm: precips.reduce((sum, v) => sum + v, 0),
    };
  } catch {
    return null;
  }
}

function heuristicPerHectareKg(field: YieldFieldInput): number {
  // Deterministic pseudo-variance, not a statistical estimate - see
  // PROJECT_REPORT.md §8 for why this exists as a documented fallback rather
  // than a claimed prediction.
  return FALLBACK_BASE_YIELD_KG_HA[field.cropType] * hashInRange(`${field.id}:season`, 0.88, 1.12);
}

async function predictedPerHectareKg(field: YieldFieldInput): Promise<{ value: number; modelBacked: boolean }> {
  const model = yieldModel.crops[field.cropType];
  if (!model) {
    // OTHER - no trained model exists for it (see FALLBACK_BASE_YIELD_KG_HA comment).
    return { value: heuristicPerHectareKg(field), modelBacked: false };
  }

  const climate = await recentClimateForField(field.latitude, field.longitude);
  if (!climate) {
    // Live climate fetch failed - fall back rather than break the page.
    return { value: heuristicPerHectareKg(field), modelBacked: false };
  }

  const predicted = predictGbm(model, [climate.avgTempC, climate.totalPrecipMm]);
  return { value: Math.max(0, predicted), modelBacked: true };
}

export async function predictFieldYield(field: YieldFieldInput, now: Date = new Date()): Promise<YieldPrediction> {
  const { value: perHectareKg, modelBacked } = await predictedPerHectareKg(field);
  const perHectareTons = perHectareKg / 1000;

  const predictedTotalTons = perHectareTons * field.areaHectares;
  // The model predicts a single point estimate (this year's expected climate
  // yield), not a distinct "prior season" - the trend comparison re-uses the
  // same documented pseudo-variance the original heuristic used, since no
  // trained model output exists for "last season" specifically.
  const priorVariance = hashInRange(`${field.id}:prior`, 0.85, 1.05);
  const priorSeasonTotalTons = predictedTotalTons * priorVariance;
  const trendPct =
    priorSeasonTotalTons > 0 ? ((predictedTotalTons - priorSeasonTotalTons) / priorSeasonTotalTons) * 100 : 0;

  const daysToHarvest = field.expectedHarvestAt ? daysBetween(now, field.expectedHarvestAt) : null;

  return {
    fieldId: field.id,
    fieldName: field.name,
    cropType: field.cropType,
    areaHectares: field.areaHectares,
    predictedTotalTons: Number(predictedTotalTons.toFixed(1)),
    predictedPerHectare: Number(perHectareTons.toFixed(2)),
    priorSeasonTotalTons: Number(priorSeasonTotalTons.toFixed(1)),
    trendPct: Number(trendPct.toFixed(1)),
    confidenceRangeTons: [Number((predictedTotalTons * 0.92).toFixed(1)), Number((predictedTotalTons * 1.08).toFixed(1))],
    confidenceLevel: confidenceLevelFor(field, daysToHarvest),
    daysToHarvest,
    modelBacked,
  };
}

export async function predictYieldForFields(fields: YieldFieldInput[], now: Date = new Date()): Promise<YieldPrediction[]> {
  const active = fields.filter((f) => f.status !== "FALLOW");
  // Independent per-field external calls, run in parallel rather than
  // sequentially - a farmer with several fields shouldn't wait N x the
  // per-field NASA POWER latency.
  return Promise.all(active.map((f) => predictFieldYield(f, now)));
}
