import { describe, it, expect, vi, afterEach } from "vitest";
import { predictFieldYield } from "@/lib/ai/yield";
import { recommendEquipmentForTask } from "@/lib/ai/recommendations";
import { forecastDemand } from "@/lib/ai/forecast";
import { hashInRange, hashToUnit } from "@/lib/ai/hash";
import { squarePolygon } from "@/lib/geo";

describe("hashInRange / hashToUnit (deterministic pseudo-variance)", () => {
  it("is a pure function of its seed - same seed always gives the same value", () => {
    expect(hashToUnit("field-1:season")).toBe(hashToUnit("field-1:season"));
    expect(hashInRange("field-1:season", 0.8, 1.2)).toBe(hashInRange("field-1:season", 0.8, 1.2));
  });

  it("stays within the requested [min, max) range", () => {
    for (const seed of ["a", "b", "field-42:prior", "wheat", ""]) {
      const value = hashInRange(seed, 0.9, 1.1);
      expect(value).toBeGreaterThanOrEqual(0.9);
      expect(value).toBeLessThanOrEqual(1.1);
    }
  });

  it("different seeds produce different values (not a constant)", () => {
    const values = new Set(["a", "b", "c", "d"].map((s) => hashToUnit(s)));
    expect(values.size).toBeGreaterThan(1);
  });
});

function nasaPowerDailyResponse(days: number, tempC: number, precipMm: number) {
  const T2M: Record<string, number> = {};
  const T2M_MAX: Record<string, number> = {};
  const T2M_MIN: Record<string, number> = {};
  const PRECTOTCORR: Record<string, number> = {};
  const start = new Date("2025-07-16T00:00:00Z");
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10).replace(/-/g, "");
    T2M[key] = tempC;
    T2M_MAX[key] = tempC + 5;
    T2M_MIN[key] = tempC - 5;
    PRECTOTCORR[key] = precipMm;
  }
  return { properties: { parameter: { T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, ALLSKY_SFC_SW_DWN: {} } } };
}

describe("predictFieldYield (real GBM model backed by live NASA POWER climate, with a documented heuristic fallback - see PROJECT_REPORT.md §8.1 and MODEL_CARD.md)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const baseField = {
    id: "field-1",
    name: "North Field",
    cropType: "WHEAT" as const,
    areaHectares: 10,
    status: "GROWING" as const,
    expectedHarvestAt: null as Date | null,
    latitude: 33.85,
    longitude: -5.5,
  };

  it("uses the trained model (modelBacked: true) when live climate data is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(nasaPowerDailyResponse(365, 20, 2)), { status: 200 }))
    );
    const result = await predictFieldYield(baseField);
    expect(result.modelBacked).toBe(true);
    expect(result.predictedTotalTons).toBeGreaterThan(0);
  });

  it("falls back to the documented heuristic (modelBacked: false) if the climate fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 }))
    );
    const result = await predictFieldYield(baseField);
    expect(result.modelBacked).toBe(false);
    expect(result.predictedTotalTons).toBeGreaterThan(0);
  });

  it("always uses the heuristic fallback for OTHER (no trained model exists for that catch-all crop type)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await predictFieldYield({ ...baseField, cropType: "OTHER" });
    expect(result.modelBacked).toBe(false);
    expect(result.predictedTotalTons).toBeGreaterThan(0);
  });

  it("scales predicted tonnage with field area", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(nasaPowerDailyResponse(365, 20, 2)), { status: 200 }))
    );
    const small = await predictFieldYield({ ...baseField, id: "same-id", areaHectares: 5 });
    const large = await predictFieldYield({ ...baseField, id: "same-id", areaHectares: 50 });
    expect(large.predictedTotalTons).toBeGreaterThan(small.predictedTotalTons);
  });

  it("is deterministic for the same field id, date, and climate response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(nasaPowerDailyResponse(365, 20, 2)), { status: 200 }))
    );
    const now = new Date("2026-01-01T00:00:00Z");
    const a = await predictFieldYield(baseField, now);
    const b = await predictFieldYield(baseField, now);
    expect(a).toEqual(b);
  });

  it("assigns HIGH confidence once a field has been harvested", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("error", { status: 500 })));
    const result = await predictFieldYield({ ...baseField, status: "HARVESTED" });
    expect(result.confidenceLevel).toBe("HIGH");
  });

  it("assigns LOW confidence when harvest is far in the future", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("error", { status: 500 })));
    const now = new Date("2026-01-01T00:00:00Z");
    const farHarvest = new Date("2026-06-01T00:00:00Z");
    const result = await predictFieldYield({ ...baseField, expectedHarvestAt: farHarvest }, now);
    expect(result.confidenceLevel).toBe("LOW");
    expect(result.daysToHarvest).toBeGreaterThan(60);
  });
});

describe("recommendEquipmentForTask (keyword + weighted scoring)", () => {
  const task = { id: "t1", title: "Harvest wheat field", status: "PENDING" as const, fieldName: "North Field" };

  it("ranks the ideal equipment type above a non-matching type", () => {
    const result = recommendEquipmentForTask(task, [
      { id: "harvester-1", name: "Big Harvester", type: "HARVESTER", status: "ACTIVE", enginePowerHp: 200 },
      { id: "plow-1", name: "Old Plow", type: "PLOW", status: "ACTIVE", enginePowerHp: 200 },
    ]);
    const harvesterScore = result.recommendations.find((r) => r.equipmentId === "harvester-1")!.fitScore;
    const plowScore = result.recommendations.find((r) => r.equipmentId === "plow-1")!.fitScore;
    expect(harvesterScore).toBeGreaterThan(plowScore);
  });

  it("penalizes equipment with maintenance due soon", () => {
    const withoutPenalty = recommendEquipmentForTask(task, [
      { id: "h1", name: "Harvester", type: "HARVESTER", status: "ACTIVE", enginePowerHp: 200 },
    ]).recommendations[0].fitScore;
    const withPenalty = recommendEquipmentForTask(task, [
      { id: "h1", name: "Harvester", type: "HARVESTER", status: "ACTIVE", enginePowerHp: 200, maintenanceDueSoon: true },
    ]).recommendations[0].fitScore;
    expect(withPenalty).toBeLessThan(withoutPenalty);
  });

  it("flags when no equipment in the fleet matches the ideal type", () => {
    const result = recommendEquipmentForTask(task, [
      { id: "p1", name: "Plow", type: "PLOW", status: "IDLE", enginePowerHp: 100 },
    ]);
    expect(result.noIdealMatchInFleet).toBe(true);
  });

  it("uses the trained classifier (reasoning mentions a confidence %) when crop/farm-size/date are available", () => {
    const result = recommendEquipmentForTask(
      {
        id: "t2",
        title: "Harvest olives",
        status: "PENDING",
        fieldName: "Olive Grove",
        cropType: "OLIVES",
        farmSizeHectares: 20,
        scheduledStart: new Date("2026-11-15T00:00:00Z"),
      },
      [{ id: "tr1", name: "Tractor", type: "TRACTOR", status: "ACTIVE", enginePowerHp: 150 }]
    );
    // Olive harvest is realistically tractor-led (see generate_synthetic_data.py),
    // unlike the plain keyword rule, which would have said HARVESTER here.
    const hasModelReasoning = result.recommendations[0].reasoning.some((r) => r.includes("confidence"));
    expect(hasModelReasoning).toBe(true);
  });

  it("falls back to the keyword rule when the crop type isn't one the classifier was trained on", () => {
    const result = recommendEquipmentForTask(
      {
        id: "t3",
        title: "Harvest wheat field",
        status: "PENDING",
        fieldName: "North Field",
        cropType: "OTHER",
        farmSizeHectares: 20,
        scheduledStart: new Date("2026-07-15T00:00:00Z"),
      },
      [{ id: "h1", name: "Harvester", type: "HARVESTER", status: "ACTIVE", enginePowerHp: 200 }]
    );
    const hasModelReasoning = result.recommendations[0].reasoning.some((r) => r.includes("confidence"));
    expect(hasModelReasoning).toBe(false);
  });
});

describe("forecastDemand (rule-based 8-week projection)", () => {
  it("excludes fallow fields from demand", () => {
    const active = forecastDemand([{ id: "f1", cropType: "WHEAT", areaHectares: 10, status: "GROWING", expectedHarvestAt: null }]);
    const fallow = forecastDemand([{ id: "f1", cropType: "WHEAT", areaHectares: 10, status: "FALLOW", expectedHarvestAt: null }]);
    expect(active.totalHoursNext8Weeks).toBeGreaterThan(0);
    expect(fallow.totalHoursNext8Weeks).toBe(0);
  });

  it("produces exactly 8 weeks of output", () => {
    const result = forecastDemand([{ id: "f1", cropType: "WHEAT", areaHectares: 10, status: "GROWING", expectedHarvestAt: null }]);
    expect(result.weeks).toHaveLength(8);
  });
});

describe("forecastDemand's platformSeasonalTrend (trained on synthetic rental history - see MODEL_CARD.md §3)", () => {
  const fields = [{ id: "f1", cropType: "WHEAT" as const, areaHectares: 10, status: "GROWING" as const, expectedHarvestAt: null }];

  it("produces one entry per week, aligned with the field-specific weeks", () => {
    const result = forecastDemand(fields);
    expect(result.platformSeasonalTrend).toHaveLength(8);
    result.platformSeasonalTrend.forEach((entry, i) => {
      expect(entry.weekStart).toBe(result.weeks[i].weekStart);
    });
  });

  it("gives every equipment type a relative-demand figure, always positive", () => {
    const result = forecastDemand(fields);
    for (const entry of result.platformSeasonalTrend) {
      for (const type of ["TRACTOR", "HARVESTER", "SPRAYER", "PLOW", "TRAILER", "IRRIGATION_PUMP"] as const) {
        expect(entry.relativeDemandByType[type]).toBeGreaterThan(0);
      }
    }
  });

  it("is a genuinely distinct signal from the field-specific hours forecast, not silently blended into it", () => {
    // Same crop/area, but the platformSeasonalTrend doesn't depend on the field's
    // area at all (it's a platform-wide relative pattern) - so scaling area up
    // must change the hours-needed weeks without touching the seasonal trend.
    const small = forecastDemand([{ ...fields[0], areaHectares: 1 }]);
    const large = forecastDemand([{ ...fields[0], areaHectares: 100 }]);
    expect(large.totalHoursNext8Weeks).toBeGreaterThan(small.totalHoursNext8Weeks);
    expect(large.platformSeasonalTrend).toEqual(small.platformSeasonalTrend);
  });
});

describe("squarePolygon (area-proportional field geometry)", () => {
  it("produces a closed ring (first and last point identical)", () => {
    const ring = squarePolygon(34.02, -6.84, 5);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring).toHaveLength(5);
  });

  it("a larger area produces a larger bounding box than a smaller one", () => {
    const small = squarePolygon(34.02, -6.84, 2);
    const large = squarePolygon(34.02, -6.84, 40);
    const spread = (ring: [number, number][]) => Math.abs(ring[2][0] - ring[0][0]);
    expect(spread(large)).toBeGreaterThan(spread(small));
  });

  it("never produces a degenerate (zero-size) polygon, even for a ~0 hectare field", () => {
    const ring = squarePolygon(34.02, -6.84, 0);
    expect(ring[2][0]).not.toBe(ring[0][0]);
  });
});
