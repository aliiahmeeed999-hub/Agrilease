import type { CropType, EquipmentType, FieldStatus } from "@/generated/prisma/enums";
import type { ForecastResult, WeeklyDemand } from "@/types/ai";
import { hashInRange } from "@/lib/ai/hash";
import demandForecastModelData from "@/lib/ai/demandForecastModel.json";

interface DemandForecastModel {
  trainedOnYears: number[];
  weeklyMeanByEquipmentType: Record<string, Record<string, number>>;
  overallMeanByEquipmentType: Record<string, number>;
}
const demandForecastModel = demandForecastModelData as unknown as DemandForecastModel;

export interface ForecastFieldInput {
  id: string;
  cropType: CropType;
  areaHectares: number;
  status: FieldStatus;
  expectedHarvestAt: Date | null;
}

const WEEKS_AHEAD = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const EQUIPMENT_TYPES: EquipmentType[] = [
  "TRACTOR",
  "HARVESTER",
  "SPRAYER",
  "PLOW",
  "TRAILER",
  "IRRIGATION_PUMP",
];

interface HarvestWindowRule {
  offsetWeeks: number;
  type: EquipmentType;
  hoursPerHa: number;
}

const HARVEST_WINDOW_RULES: Record<CropType, HarvestWindowRule[]> = {
  WHEAT: [
    { offsetWeeks: -5, type: "SPRAYER", hoursPerHa: 0.3 },
    { offsetWeeks: -1, type: "HARVESTER", hoursPerHa: 0.6 },
    { offsetWeeks: 0, type: "HARVESTER", hoursPerHa: 0.6 },
    { offsetWeeks: 0, type: "TRAILER", hoursPerHa: 0.4 },
  ],
  BARLEY: [
    { offsetWeeks: -5, type: "SPRAYER", hoursPerHa: 0.25 },
    { offsetWeeks: -1, type: "HARVESTER", hoursPerHa: 0.55 },
    { offsetWeeks: 0, type: "HARVESTER", hoursPerHa: 0.55 },
    { offsetWeeks: 0, type: "TRAILER", hoursPerHa: 0.35 },
  ],
  OLIVES: [{ offsetWeeks: -6, type: "PLOW", hoursPerHa: 0.15 }],
  CITRUS: [
    { offsetWeeks: -4, type: "SPRAYER", hoursPerHa: 0.2 },
    { offsetWeeks: -1, type: "TRAILER", hoursPerHa: 0.5 },
    { offsetWeeks: 0, type: "TRAILER", hoursPerHa: 0.5 },
  ],
  VEGETABLES: [
    { offsetWeeks: -3, type: "SPRAYER", hoursPerHa: 0.25 },
    { offsetWeeks: 0, type: "TRAILER", hoursPerHa: 0.3 },
  ],
  OTHER: [{ offsetWeeks: 0, type: "TRACTOR", hoursPerHa: 0.2 }],
};

const RECURRING_WEEKLY: Record<CropType, { type: EquipmentType; hoursPerHa: number }> = {
  WHEAT: { type: "IRRIGATION_PUMP", hoursPerHa: 0.15 },
  BARLEY: { type: "IRRIGATION_PUMP", hoursPerHa: 0.15 },
  OLIVES: { type: "IRRIGATION_PUMP", hoursPerHa: 0.2 },
  CITRUS: { type: "IRRIGATION_PUMP", hoursPerHa: 0.3 },
  VEGETABLES: { type: "IRRIGATION_PUMP", hoursPerHa: 0.35 },
  OTHER: { type: "IRRIGATION_PUMP", hoursPerHa: 0.1 },
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function emptyWeek(weekStart: Date): WeeklyDemand {
  const week = { weekStart: weekStart.toISOString().slice(0, 10) } as WeeklyDemand;
  for (const type of EQUIPMENT_TYPES) {
    week[type] = 0;
  }
  return week;
}

// Standard ISO-8601 week-of-year (the same convention the synthetic training
// data's week numbers follow - see scripts/ml/generate_synthetic_data.py).
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0 .. Sunday = 6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday determines the ISO year/week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / WEEK_MS);
}

// A distinct, clearly-separate signal from the field-specific hours-needed
// forecast above - trained on synthetic platform-wide rental history (see
// scripts/ml/train_demand_forecast.py and MODEL_CARD.md for the real,
// honestly-reported evaluation: a +/-2-week-smoothed seasonal average, which
// performs only about on par with a flat baseline on held-out synthetic data,
// not a strong signal - shown as a relative "busier/quieter than usual"
// multiplier rather than an absolute count for that reason.
function platformSeasonalTrendFor(weeks: WeeklyDemand[]): ForecastResult["platformSeasonalTrend"] {
  return weeks.map((week) => {
    const wk = isoWeek(new Date(`${week.weekStart}T00:00:00Z`));
    const relativeDemandByType = {} as Record<EquipmentType, number>;
    for (const type of EQUIPMENT_TYPES) {
      const weeklyMean = demandForecastModel.weeklyMeanByEquipmentType[type]?.[String(wk)];
      const overallMean = demandForecastModel.overallMeanByEquipmentType[type];
      relativeDemandByType[type] =
        overallMean > 0 && weeklyMean !== undefined ? Number((weeklyMean / overallMean).toFixed(2)) : 1;
    }
    return { weekStart: week.weekStart, relativeDemandByType };
  });
}

export function forecastDemand(fields: ForecastFieldInput[], now: Date = new Date()): ForecastResult {
  const currentWeekStart = startOfWeek(now);
  const weeks: WeeklyDemand[] = Array.from({ length: WEEKS_AHEAD }, (_, i) =>
    emptyWeek(new Date(currentWeekStart.getTime() + i * WEEK_MS))
  );

  const activeFields = fields.filter((f) => f.status !== "FALLOW");

  weeks.forEach((week, weekIndex) => {
    const weekStartDate = new Date(currentWeekStart.getTime() + weekIndex * WEEK_MS);

    for (const field of activeFields) {
      const recurring = RECURRING_WEEKLY[field.cropType];
      const recurringHours =
        recurring.hoursPerHa * field.areaHectares * hashInRange(`${field.id}:w${weekIndex}:recurring`, 0.9, 1.1);
      week[recurring.type] += recurringHours;

      if (field.expectedHarvestAt) {
        const offsetWeeks = Math.round(
          (weekStartDate.getTime() - field.expectedHarvestAt.getTime()) / WEEK_MS
        );
        const rules = HARVEST_WINDOW_RULES[field.cropType].filter((r) => r.offsetWeeks === offsetWeeks);
        for (const rule of rules) {
          const hours =
            rule.hoursPerHa * field.areaHectares * hashInRange(`${field.id}:w${weekIndex}:${rule.type}`, 0.9, 1.1);
          week[rule.type] += hours;
        }
      }
    }

    for (const type of EQUIPMENT_TYPES) {
      week[type] = Number(week[type].toFixed(1));
    }
  });

  const totalsByType = EQUIPMENT_TYPES.map((type) => ({
    type,
    total: weeks.reduce((sum, w) => sum + w[type], 0),
  }));
  const topType = totalsByType.reduce((max, cur) => (cur.total > max.total ? cur : max)).type;
  const totalHoursNext8Weeks = Number(totalsByType.reduce((sum, t) => sum + t.total, 0).toFixed(1));

  return { weeks, topType, totalHoursNext8Weeks, platformSeasonalTrend: platformSeasonalTrendFor(weeks) };
}
