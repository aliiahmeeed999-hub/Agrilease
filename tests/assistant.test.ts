import { describe, it, expect } from "vitest";
import { createTranslator } from "use-intl/core";
import messages from "../messages/en.json";
import { buildAssistantReply, type AssistantContext, type Translate } from "@/lib/ai/assistant";

const t = createTranslator({ locale: "en", messages, namespace: "ai" }) as unknown as Translate;
const tCommon = createTranslator({ locale: "en", messages, namespace: "common" }) as unknown as Translate;

const baseContext: AssistantContext = {
  fullName: "Test Farmer",
  yields: [],
  recommendations: { upcoming: [], completedReview: [] },
  forecast: {
    weeks: [],
    topType: "TRACTOR",
    totalHoursNext8Weeks: 0,
    platformSeasonalTrend: [],
  },
  weather: null,
  soil: null,
};

describe("buildAssistantReply - weather/soil grounding (Phase 3 expansion)", () => {
  it("reports real-time weather data when available, including frost/heat risk", () => {
    const reply = buildAssistantReply("what's the weather like?", {
      ...baseContext,
      weather: {
        temperatureC: 5,
        humidityPct: 80,
        windSpeedKmh: 10,
        rainfallMm: 0,
        pressureHpa: 1010,
        rainProbabilityPct: 20,
        isFrostRisk: true,
        isHeatRisk: false,
        fetchedAt: new Date().toISOString(),
        source: "open-meteo",
        stale: false,
      },
    }, t, tCommon);
    expect(reply.reply).toContain("5.0");
    expect(reply.reply).toContain("Frost risk");
  });

  it("tells the user weather is unavailable rather than fabricating a value", () => {
    const reply = buildAssistantReply("how's the weather today", baseContext, t, tCommon);
    expect(reply.reply).toMatch(/don't have live weather data/i);
  });

  it("reports soil composition when available", () => {
    const reply = buildAssistantReply("tell me about my soil", {
      ...baseContext,
      soil: {
        ph: 7.2,
        nitrogen: 2.1,
        organicMatterPct: 3.5,
        phosphorus: null,
        potassium: null,
        soilMoisturePct: null,
        fetchedAt: new Date().toISOString(),
        source: "soilgrids",
        stale: false,
      },
    }, t, tCommon);
    expect(reply.reply).toContain("7.2");
    expect(reply.reply).toContain("3.5%");
  });

  it("mentions when a yield prediction is model-backed vs a fallback estimate", () => {
    const reply = buildAssistantReply("what's my yield outlook", {
      ...baseContext,
      yields: [
        {
          fieldId: "f1",
          fieldName: "North Field",
          cropType: "WHEAT",
          areaHectares: 10,
          predictedTotalTons: 30,
          predictedPerHectare: 3,
          priorSeasonTotalTons: 28,
          trendPct: 7,
          confidenceRangeTons: [27, 33],
          confidenceLevel: "MEDIUM",
          daysToHarvest: 40,
          modelBacked: true,
        },
      ],
    }, t, tCommon);
    expect(reply.reply).toContain("trained model");
  });
});
