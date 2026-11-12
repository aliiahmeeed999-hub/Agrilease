import type { AiReference, AssistantReply, ForecastResult, TaskRecommendation, YieldPrediction } from "@/types/ai";
import type { EquipmentType } from "@/generated/prisma/enums";
import type { WeatherSnapshot } from "@/types/weather";
import type { SoilSnapshot } from "@/types/soil";

type Intent = "YIELD" | "RECOMMENDATION" | "FORECAST" | "WEATHER" | "SOIL" | "GREETING" | "FALLBACK";

// Plain (key, values) => string shape rather than next-intl's own translator
// type, so this lib stays decoupled from next-intl's generic surface. Callers
// pass the bound `t`/`tCommon` functions from getTranslations(), cast to this
// type at the call site (`as unknown as Translate`) - next-intl's own type
// uses per-key conditional overloads that aren't structurally assignable to
// any plain function signature, so a cast is the only practical bridge here.
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface AssistantContext {
  fullName: string;
  yields: YieldPrediction[];
  recommendations: { upcoming: TaskRecommendation[]; completedReview: TaskRecommendation[] };
  forecast: ForecastResult;
  // Live data for the farmer's primary farm (see api/ai/assistant/route.ts) -
  // null if the farmer has no farm yet, or the live fetch failed.
  weather: WeatherSnapshot | null;
  soil: SoilSnapshot | null;
}

function classifyIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/\b(yield|production|how much.*(produce|harvest)|harvest.*expect)/.test(m)) return "YIELD";
  if (/\b(recommend|which (equipment|tractor|machine)|best equipment|fleet gap)/.test(m)) return "RECOMMENDATION";
  if (/\b(demand|forecast|next week|coming weeks|need equipment|busy)/.test(m)) return "FORECAST";
  if (/\b(weather|rain|frost|heat|temperature|humid|wind)/.test(m)) return "WEATHER";
  if (/\b(soil|ph|nitrogen|organic matter)/.test(m)) return "SOIL";
  if (/^\s*(hi|hello|hey|salut|bonjour|salam)\b/.test(m)) return "GREETING";
  return "FALLBACK";
}

const EQUIPMENT_TYPES: EquipmentType[] = ["TRACTOR", "HARVESTER", "SPRAYER", "PLOW", "TRAILER", "IRRIGATION_PUMP"];

function weekTotalHours(week: ForecastResult["weeks"][number]) {
  return EQUIPMENT_TYPES.reduce((sum, type) => sum + week[type], 0);
}

function replyForYield(context: AssistantContext, t: Translate, tCommon: Translate): AssistantReply {
  if (context.yields.length === 0) {
    return { reply: t("noFieldsYield"), references: [] };
  }

  const top = [...context.yields].sort((a, b) => b.predictedTotalTons - a.predictedTotalTons).slice(0, 3);
  const lines = top.map((f) =>
    t("assistantYieldLine", {
      fieldName: f.fieldName,
      cropType: tCommon(`crop.${f.cropType}`),
      tons: f.predictedTotalTons,
      direction: f.trendPct >= 0 ? "up" : "down",
      pct: Math.abs(f.trendPct),
      confidence: tCommon(`confidence.${f.confidenceLevel}`),
      modelNote: f.modelBacked ? t("assistantModelBackedNote") : t("assistantEstimateOnlyNote"),
    })
  );

  const references: AiReference[] = top.map((f) => ({
    type: "field",
    id: f.fieldId,
    label: f.fieldName,
    href: "/ai/yield",
  }));

  return {
    reply: `${t("assistantYieldIntro")}\n${lines.join("\n")}`,
    references,
  };
}

function replyForRecommendation(context: AssistantContext, t: Translate): AssistantReply {
  const { upcoming } = context.recommendations;
  if (upcoming.length === 0) {
    return { reply: t("noUpcomingTasks"), references: [] };
  }

  const gaps = upcoming.filter((task) => task.noIdealMatchInFleet);
  const best = upcoming[0];
  const bestFit = best.recommendations[0];

  let reply = bestFit
    ? t("assistantRecommendationBestFit", {
        taskTitle: best.taskTitle,
        equipmentName: bestFit.equipmentName,
        score: bestFit.fitScore,
        reasoning: bestFit.reasoning[0] ?? "",
      })
    : t("assistantRecommendationNoMatch", { taskTitle: best.taskTitle });

  if (gaps.length > 0) {
    reply += ` ${t("assistantRecommendationGapsNote", { count: gaps.length })}`;
  }

  const references: AiReference[] = upcoming.slice(0, 3).map((task) => ({
    type: "task",
    id: task.taskId,
    label: task.taskTitle,
    href: "/ai/recommendations",
  }));

  return { reply, references };
}

function replyForForecast(context: AssistantContext, t: Translate, tCommon: Translate): AssistantReply {
  const { forecast } = context;
  if (forecast.totalHoursNext8Weeks === 0) {
    return { reply: t("assistantForecastEmpty"), references: [] };
  }

  const peakWeek = [...forecast.weeks].sort((a, b) => weekTotalHours(b) - weekTotalHours(a))[0];

  const platformPeak = [...forecast.platformSeasonalTrend].sort(
    (a, b) => Math.max(...Object.values(b.relativeDemandByType)) - Math.max(...Object.values(a.relativeDemandByType))
  )[0];
  const platformNote = platformPeak
    ? t("assistantForecastPlatformNote", { date: platformPeak.weekStart })
    : "";

  return {
    reply: t("assistantForecastSummary", {
      hours: forecast.totalHoursNext8Weeks,
      equipmentType: tCommon(`equipmentType.${forecast.topType}`),
      date: peakWeek.weekStart,
      platformNote,
    }),
    references: [{ type: "field", id: "forecast", label: t("forecastTitle"), href: "/ai/forecast" }],
  };
}

function replyForWeather(context: AssistantContext, t: Translate): AssistantReply {
  if (!context.weather) {
    return { reply: t("assistantWeatherNoData"), references: [] };
  }
  const w = context.weather;
  const parts: string[] = [];
  if (w.temperatureC !== null) parts.push(t("assistantWeatherTemp", { temp: w.temperatureC.toFixed(1) }));
  if (w.humidityPct !== null) parts.push(t("assistantWeatherHumidity", { pct: Math.round(w.humidityPct) }));
  if (w.rainProbabilityPct !== null) parts.push(t("assistantWeatherRainChance", { pct: Math.round(w.rainProbabilityPct) }));

  let reply = parts.length > 0 ? t("assistantWeatherSummary", { parts: parts.join(", ") }) : t("assistantWeatherUnavailable");
  if (w.isFrostRisk) reply += t("assistantWeatherFrostRisk");
  if (w.isHeatRisk) reply += t("assistantWeatherHeatRisk");
  if (w.stale) reply += t("assistantWeatherStale");

  return { reply, references: [{ type: "field", id: "weather", label: t("assistantWeatherLabel"), href: "/farms" }] };
}

function replyForSoil(context: AssistantContext, t: Translate): AssistantReply {
  if (!context.soil) {
    return { reply: t("assistantSoilNoData"), references: [] };
  }
  const s = context.soil;
  if (s.ph === null && s.nitrogen === null && s.organicMatterPct === null) {
    return { reply: t("assistantSoilNoCoverage"), references: [] };
  }
  const parts: string[] = [];
  if (s.ph !== null) parts.push(t("assistantSoilPh", { value: s.ph.toFixed(1) }));
  if (s.organicMatterPct !== null) parts.push(t("assistantSoilOrganicMatter", { pct: s.organicMatterPct.toFixed(1) }));
  if (s.nitrogen !== null) parts.push(t("assistantSoilNitrogen", { value: s.nitrogen.toFixed(2) }));

  return {
    reply: t("assistantSoilSummary", { parts: parts.join(", ") }),
    references: [{ type: "field", id: "soil", label: t("assistantSoilLabel"), href: "/farms" }],
  };
}

export function buildAssistantReply(
  message: string,
  context: AssistantContext,
  t: Translate,
  tCommon: Translate
): AssistantReply {
  const intent = classifyIntent(message);

  switch (intent) {
    case "YIELD":
      return replyForYield(context, t, tCommon);
    case "RECOMMENDATION":
      return replyForRecommendation(context, t);
    case "FORECAST":
      return replyForForecast(context, t, tCommon);
    case "WEATHER":
      return replyForWeather(context, t);
    case "SOIL":
      return replyForSoil(context, t);
    case "GREETING":
      return { reply: t("chatGreeting", { name: context.fullName.split(" ")[0] }), references: [] };
    default:
      return { reply: t("assistantFallback"), references: [] };
  }
}
