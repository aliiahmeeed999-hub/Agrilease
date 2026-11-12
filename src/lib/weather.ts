import { prisma } from "@/lib/prisma";
import type { WeatherSnapshot } from "@/types/weather";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour - current conditions change quickly
const FETCH_TIMEOUT_MS = 8000;

// Simple, documented thresholds rather than a real agronomic model - flagged
// the same way the AI heuristics are (see PROJECT_REPORT.md §8): a forecasted
// overnight low at/below this is treated as frost risk, a forecasted daytime
// high at/above this as heat-stress risk.
const FROST_RISK_MAX_C = 2;
const HEAT_RISK_MIN_C = 40;

async function fetchOpenMeteoCurrent(lat: number, lng: number): Promise<Omit<WeatherSnapshot, "fetchedAt" | "source" | "stale">> {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation");
  url.searchParams.set("daily", "precipitation_probability_max,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Open-Meteo request failed with status ${res.status}`);
    const body = await res.json();

    const current = body.current ?? {};
    const daily = body.daily ?? {};
    const todayMax: number | null = daily.temperature_2m_max?.[0] ?? null;
    const todayMin: number | null = daily.temperature_2m_min?.[0] ?? null;

    return {
      temperatureC: current.temperature_2m ?? null,
      humidityPct: current.relative_humidity_2m ?? null,
      windSpeedKmh: current.wind_speed_10m ?? null,
      rainfallMm: current.precipitation ?? null,
      pressureHpa: current.surface_pressure ?? null,
      rainProbabilityPct: daily.precipitation_probability_max?.[0] ?? null,
      isFrostRisk: todayMin !== null && todayMin <= FROST_RISK_MAX_C,
      isHeatRisk: todayMax !== null && todayMax >= HEAT_RISK_MIN_C,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function toSnapshot(
  row: {
    fetchedAt: Date;
    temperatureC: number | null;
    humidityPct: number | null;
    windSpeedKmh: number | null;
    rainfallMm: number | null;
    pressureHpa: number | null;
    rainProbabilityPct: number | null;
    isFrostRisk: boolean;
    isHeatRisk: boolean;
    source: string;
  },
  stale: boolean
): WeatherSnapshot {
  return {
    temperatureC: row.temperatureC,
    humidityPct: row.humidityPct,
    windSpeedKmh: row.windSpeedKmh,
    rainfallMm: row.rainfallMm,
    pressureHpa: row.pressureHpa,
    rainProbabilityPct: row.rainProbabilityPct,
    isFrostRisk: row.isFrostRisk,
    isHeatRisk: row.isHeatRisk,
    fetchedAt: row.fetchedAt.toISOString(),
    source: row.source,
    stale,
  };
}

// Refreshes on read (no scheduler in this stack - same lazy pattern already
// used by src/lib/notifications.ts): if the cached row is missing or older
// than CACHE_TTL_MS, tries a live Open-Meteo fetch and upserts the result.
// If that live fetch fails (network error, timeout, non-2xx), falls back to
// whatever cached row already exists (marked `stale: true`) rather than
// breaking the page; only returns null if there is truly nothing to show yet.
export async function getFarmWeather(farmId: string, lat: number, lng: number): Promise<WeatherSnapshot | null> {
  const cached = await prisma.weatherCache.findUnique({ where: { farmId } });
  const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

  if (isFresh) return toSnapshot(cached, false);

  try {
    const fresh = await fetchOpenMeteoCurrent(lat, lng);
    const saved = await prisma.weatherCache.upsert({
      where: { farmId },
      create: { farmId, fetchedAt: new Date(), ...fresh, source: "open-meteo" },
      update: { fetchedAt: new Date(), ...fresh, source: "open-meteo" },
    });
    return toSnapshot(saved, false);
  } catch {
    if (cached) return toSnapshot(cached, true);
    return null;
  }
}
