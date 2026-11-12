import { TtlCache } from "@/lib/ttl-cache";
import { CLIMATE_VARIABLES, type ClimateMode, type ClimateSeries, type ClimateVariable } from "@/types/geodata";

const NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point";
const NASA_POWER_BASE = "https://power.larc.nasa.gov/api";
const FETCH_TIMEOUT_MS = 15000;
const FILL_VALUE = -999; // NASA POWER's documented sentinel for "no data"

export interface NasaPowerDailyPoint {
  date: string; // YYYY-MM-DD
  tempAvgC: number | null;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipitationMm: number | null;
  solarRadiationMJm2: number | null;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function parseDate(key: string) {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

function nullIfFill(value: number | undefined): number | null {
  if (value === undefined || value === FILL_VALUE) return null;
  return value;
}

// Not cached in a table (unlike weather.ts/soil.ts) - this session's schema
// only has a WeatherCache shaped for a single current-conditions snapshot, not
// a time series, and this data is only consumed by the irrigation/water-balance
// estimate (src/lib/irrigation.ts), which recomputes on demand rather than on
// every page load. If this ends up called often enough to matter, the right
// fix is a dedicated time-series table, not overloading WeatherCache.
export async function fetchNasaPowerDaily(
  lat: number,
  lng: number,
  startDate: Date,
  endDate: Date
): Promise<NasaPowerDailyPoint[]> {
  const url = new URL(NASA_POWER_URL);
  url.searchParams.set("parameters", "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN");
  url.searchParams.set("community", "AG");
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("start", formatDate(startDate));
  url.searchParams.set("end", formatDate(endDate));
  url.searchParams.set("format", "JSON");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`NASA POWER request failed with status ${res.status}`);
    const body = await res.json();
    const params = body.properties?.parameter ?? {};
    const dateKeys = Object.keys(params.T2M_MAX ?? {});

    return dateKeys.map((key) => ({
      date: parseDate(key),
      tempAvgC: nullIfFill(params.T2M?.[key]),
      tempMaxC: nullIfFill(params.T2M_MAX?.[key]),
      tempMinC: nullIfFill(params.T2M_MIN?.[key]),
      precipitationMm: nullIfFill(params.PRECTOTCORR?.[key]),
      solarRadiationMJm2: nullIfFill(params.ALLSKY_SFC_SW_DWN?.[key]),
    }));
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Climate explorer (src/app/api/climate/route.ts)
//
// NASA POWER values are MODELLED estimates (MERRA-2 reanalysis and CERES
// satellite products) on a grid of about 0.5° x 0.625° (~50 km), not readings
// from a weather station at the clicked point, and not forecasts. Callers show
// the source, resolution and date range alongside every chart.

const climateCache = new TtlCache<ClimateSeries>(7 * 24 * 60 * 60 * 1000, 400);

export class ClimateUnavailableError extends Error {}

const DEFAULT_UNITS: Record<ClimateVariable, string> = {
  T2M: "°C",
  T2M_MAX: "°C",
  T2M_MIN: "°C",
  PRECTOTCORR: "mm/day",
  ALLSKY_SFC_SW_DWN: "MJ/m²/day",
  WS2M: "m/s",
  RH2M: "%",
};

const CLIMATOLOGY_PERIODS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export interface ClimateRequest {
  lat: number;
  lng: number;
  mode: ClimateMode;
  // daily: YYYY-MM-DD; monthly: YYYY; ignored for climatology
  start?: string;
  end?: string;
}

export async function fetchClimateSeries(req: ClimateRequest): Promise<ClimateSeries> {
  const lat = Math.round(req.lat * 1000) / 1000;
  const lng = Math.round(req.lng * 1000) / 1000;
  const key = `${req.mode}:${lat},${lng}:${req.start ?? ""}:${req.end ?? ""}`;
  const cached = climateCache.get(key);
  if (cached) return cached;

  const url = new URL(`${NASA_POWER_BASE}/temporal/${req.mode === "climatology" ? "climatology" : req.mode}/point`);
  url.searchParams.set("parameters", CLIMATE_VARIABLES.join(","));
  url.searchParams.set("community", "AG");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("format", "JSON");
  if (req.mode === "daily") {
    url.searchParams.set("start", req.start!.replace(/-/g, ""));
    url.searchParams.set("end", req.end!.replace(/-/g, ""));
  } else if (req.mode === "monthly") {
    url.searchParams.set("start", req.start!);
    url.searchParams.set("end", req.end!);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new ClimateUnavailableError(`NASA POWER request failed (${res.status})`);
    const body = await res.json();
    const params: Partial<Record<ClimateVariable, Record<string, number>>> = body.properties?.parameter ?? {};
    const periodKeys = Object.keys(params.T2M ?? {});

    let periods: { key: string; label: string }[];
    if (req.mode === "daily") {
      periods = periodKeys.map((k) => ({ key: k, label: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}` }));
    } else if (req.mode === "monthly") {
      // YYYY13 is POWER's annual summary row; the monthly view leaves it out.
      periods = periodKeys.filter((k) => !k.endsWith("13")).map((k) => ({ key: k, label: `${k.slice(0, 4)}-${k.slice(4, 6)}` }));
    } else {
      periods = CLIMATOLOGY_PERIODS.filter((k) => periodKeys.includes(k)).map((k) => ({ key: k, label: k }));
    }

    const units = { ...DEFAULT_UNITS };
    for (const v of CLIMATE_VARIABLES) {
      const u = body.parameters?.[v]?.units;
      if (typeof u === "string") units[v] = u === "C" ? "°C" : u.replace("MJ/m^2/day", "MJ/m²/day");
    }

    const series: ClimateSeries = {
      lat,
      lng,
      mode: req.mode,
      rows: periods.map(({ key: pk, label }) => {
        const row: ClimateSeries["rows"][number] = { period: label };
        for (const v of CLIMATE_VARIABLES) row[v] = nullIfFill(params[v]?.[pk]);
        return row;
      }),
      units,
      source:
        req.mode === "climatology"
          ? `NASA POWER (${body.header?.sources?.join(", ") ?? "MERRA-2"}), ${body.header?.range ?? "long-term averages"}`
          : `NASA POWER (${body.header?.sources?.join(", ") ?? "MERRA-2, CERES"})`,
      gridResolution: "0.5° × 0.625°",
      range: body.header?.start && body.header?.end ? { start: body.header.start, end: body.header.end } : null,
      fetchedAt: new Date().toISOString(),
    };
    climateCache.set(key, series);
    return series;
  } catch (err) {
    if (err instanceof ClimateUnavailableError) throw err;
    throw new ClimateUnavailableError("NASA POWER is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
