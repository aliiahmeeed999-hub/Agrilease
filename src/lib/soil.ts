import { prisma } from "@/lib/prisma";
import type { SoilSnapshot } from "@/types/soil";

const SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days - soil composition changes slowly
const FETCH_TIMEOUT_MS = 15000; // SoilGrids' REST API has been observed to take several seconds
const DEPTH = "0-5cm";

// Van Bemmelen factor: organic matter % = organic carbon % x 1.724 (a standard,
// widely-used agronomic conversion, not something SoilGrids returns directly).
const ORGANIC_CARBON_TO_MATTER_FACTOR = 1.724;

interface SoilGridsLayer {
  name: string;
  unit_measure: { d_factor: number };
  depths: { label: string; values: { mean: number | null } }[];
}

function readProperty(layers: SoilGridsLayer[], name: string): number | null {
  const layer = layers.find((l) => l.name === name);
  const depth = layer?.depths.find((d) => d.label === DEPTH);
  const raw = depth?.values.mean;
  if (raw === null || raw === undefined) return null;
  return raw / (layer?.unit_measure.d_factor ?? 1);
}

async function fetchSoilGrids(lat: number, lng: number): Promise<Omit<SoilSnapshot, "fetchedAt" | "source" | "stale">> {
  const url = new URL(SOILGRIDS_URL);
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("lat", String(lat));
  for (const property of ["phh2o", "soc", "nitrogen"]) {
    url.searchParams.append("property", property);
  }
  url.searchParams.set("depth", DEPTH);
  url.searchParams.set("value", "mean");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`SoilGrids request failed with status ${res.status}`);
    const body = await res.json();
    const layers: SoilGridsLayer[] = body.properties?.layers ?? [];

    const ph = readProperty(layers, "phh2o");
    const socGKg = readProperty(layers, "soc");
    const nitrogenGKg = readProperty(layers, "nitrogen");

    return {
      ph,
      nitrogen: nitrogenGKg,
      organicMatterPct: socGKg !== null ? Number(((socGKg / 10) * ORGANIC_CARBON_TO_MATTER_FACTOR).toFixed(2)) : null,
      phosphorus: null,
      potassium: null,
      soilMoisturePct: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function toSnapshot(
  row: {
    fetchedAt: Date;
    ph: number | null;
    nitrogen: number | null;
    organicMatterPct: number | null;
    source: string;
  },
  stale: boolean
): SoilSnapshot {
  return {
    ph: row.ph,
    nitrogen: row.nitrogen,
    organicMatterPct: row.organicMatterPct,
    phosphorus: null,
    potassium: null,
    soilMoisturePct: null,
    fetchedAt: row.fetchedAt.toISOString(),
    source: row.source,
    stale,
  };
}

// Same lazy-refresh-with-stale-fallback pattern as getFarmWeather (see
// src/lib/weather.ts) but with a much longer TTL, since soil composition
// doesn't meaningfully change week to week. A fresh fetch that legitimately
// returns "no data at this exact point" (a real, observed SoilGrids behavior
// near coastlines/urban areas - confirmed while building this) is still
// cached and returned as non-stale; `stale: true` specifically means "the
// live request failed and this is an old cached answer," not "no data."
export async function getFarmSoil(farmId: string, lat: number, lng: number): Promise<SoilSnapshot | null> {
  const cached = await prisma.soilCache.findUnique({ where: { farmId } });
  const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

  if (isFresh) return toSnapshot(cached, false);

  try {
    const fresh = await fetchSoilGrids(lat, lng);
    const saved = await prisma.soilCache.upsert({
      where: { farmId },
      create: {
        farmId,
        fetchedAt: new Date(),
        ph: fresh.ph,
        nitrogen: fresh.nitrogen,
        organicMatterPct: fresh.organicMatterPct,
        source: "soilgrids",
      },
      update: {
        fetchedAt: new Date(),
        ph: fresh.ph,
        nitrogen: fresh.nitrogen,
        organicMatterPct: fresh.organicMatterPct,
        source: "soilgrids",
      },
    });
    return toSnapshot(saved, false);
  } catch {
    if (cached) return toSnapshot(cached, true);
    return null;
  }
}
