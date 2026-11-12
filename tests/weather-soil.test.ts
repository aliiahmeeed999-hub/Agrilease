import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFarmWeather } from "@/lib/weather";
import { getFarmSoil } from "@/lib/soil";
import { createTestUser, uniqueEmail } from "./helpers";

async function createTestFarm(ownerId: string) {
  return prisma.farm.create({
    data: {
      ownerId,
      name: `Test Farm ${uniqueEmail("farm")}`,
      region: "Fes-Meknes",
      sizeHectares: 10,
      latitude: 33.85,
      longitude: -5.5,
    },
  });
}

function openMeteoResponse(overrides: Partial<{ temp: number; humidity: number }> = {}) {
  return {
    current: {
      temperature_2m: overrides.temp ?? 25,
      relative_humidity_2m: overrides.humidity ?? 50,
      wind_speed_10m: 10,
      surface_pressure: 1013,
      precipitation: 0,
    },
    daily: {
      precipitation_probability_max: [10],
      temperature_2m_max: [30],
      temperature_2m_min: [15],
    },
  };
}

function soilGridsResponse() {
  return {
    properties: {
      layers: [
        { name: "phh2o", unit_measure: { d_factor: 10 }, depths: [{ label: "0-5cm", values: { mean: 70 } }] },
        { name: "soc", unit_measure: { d_factor: 10 }, depths: [{ label: "0-5cm", values: { mean: 250 } }] },
        { name: "nitrogen", unit_measure: { d_factor: 100 }, depths: [{ label: "0-5cm", values: { mean: 200 } }] },
      ],
    },
  };
}

describe("getFarmWeather (Open-Meteo cache + fallback)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches live on a cache miss and stores the result", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await createTestFarm(user.id);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(openMeteoResponse({ temp: 22 })), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getFarmWeather(farm.id, farm.latitude, farm.longitude);
    expect(result).not.toBeNull();
    expect(result!.temperatureC).toBe(22);
    expect(result!.stale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const stored = await prisma.weatherCache.findUnique({ where: { farmId: farm.id } });
    expect(stored?.temperatureC).toBe(22);
  });

  it("serves from cache without a live fetch while the cache is still fresh", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await createTestFarm(user.id);
    await prisma.weatherCache.create({
      data: { farmId: farm.id, fetchedAt: new Date(), temperatureC: 19, source: "open-meteo" },
    });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getFarmWeather(farm.id, farm.latitude, farm.longitude);
    expect(result!.temperatureC).toBe(19);
    expect(result!.stale).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to stale cached data when a refresh attempt fails", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await createTestFarm(user.id);
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // older than the 1h TTL
    await prisma.weatherCache.create({
      data: { farmId: farm.id, fetchedAt: oldDate, temperatureC: 18, source: "open-meteo" },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 }))
    );

    const result = await getFarmWeather(farm.id, farm.latitude, farm.longitude);
    expect(result).not.toBeNull();
    expect(result!.temperatureC).toBe(18);
    expect(result!.stale).toBe(true);
  });

  it("returns null (not a broken page) when there is no cache and the live fetch fails", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await createTestFarm(user.id);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 }))
    );

    const result = await getFarmWeather(farm.id, farm.latitude, farm.longitude);
    expect(result).toBeNull();
  });

  it("flags frost risk and heat risk from the daily forecast thresholds", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farmCold = await createTestFarm(user.id);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            current: { temperature_2m: 5, relative_humidity_2m: 80, wind_speed_10m: 5, surface_pressure: 1010, precipitation: 0 },
            daily: { precipitation_probability_max: [0], temperature_2m_max: [10], temperature_2m_min: [1] },
          }),
          { status: 200 }
        )
      )
    );
    const cold = await getFarmWeather(farmCold.id, farmCold.latitude, farmCold.longitude);
    expect(cold!.isFrostRisk).toBe(true);
    expect(cold!.isHeatRisk).toBe(false);
  });
});

describe("getFarmSoil (SoilGrids cache + fallback)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches live, converts units, and stores the result", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await createTestFarm(user.id);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(soilGridsResponse()), { status: 200 })));

    const result = await getFarmSoil(farm.id, farm.latitude, farm.longitude);
    expect(result).not.toBeNull();
    expect(result!.ph).toBeCloseTo(7.0, 5); // 70 / d_factor(10)
    expect(result!.nitrogen).toBeCloseTo(2.0, 5); // 200 / d_factor(100)
    expect(result!.organicMatterPct).toBeCloseTo((250 / 10 / 10) * 1.724, 2);
    expect(result!.phosphorus).toBeNull();
    expect(result!.potassium).toBeNull();
    expect(result!.soilMoisturePct).toBeNull();
  });

  it("falls back to stale cached data when a refresh attempt fails", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await createTestFarm(user.id);
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // older than the 30-day TTL
    await prisma.soilCache.create({
      data: { farmId: farm.id, fetchedAt: oldDate, ph: 6.5, source: "soilgrids" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 }))
    );

    const result = await getFarmSoil(farm.id, farm.latitude, farm.longitude);
    expect(result!.ph).toBe(6.5);
    expect(result!.stale).toBe(true);
  });

  it("still returns (and caches) a successful fetch with all-null properties, without treating it as stale", async () => {
    // A real, observed SoilGrids behavior near coastlines/urban areas - see
    // src/lib/soil.ts's comment. This must be distinguished from a failed request.
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await createTestFarm(user.id);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              properties: {
                layers: [
                  { name: "phh2o", unit_measure: { d_factor: 10 }, depths: [{ label: "0-5cm", values: { mean: null } }] },
                ],
              },
            }),
            { status: 200 }
          )
      )
    );

    const result = await getFarmSoil(farm.id, farm.latitude, farm.longitude);
    expect(result).not.toBeNull();
    expect(result!.stale).toBe(false);
    expect(result!.ph).toBeNull();
  });
});
