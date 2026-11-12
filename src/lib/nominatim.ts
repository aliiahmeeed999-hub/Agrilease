import { TtlCache } from "@/lib/ttl-cache";
import type { GeoSearchResult } from "@/types/geodata";

// Place search via OpenStreetMap Nominatim. The public instance allows at
// most one request per second from an identified application and no
// autocomplete, so the app searches on submit (not per keystroke), results
// are cached, and requests are spaced server-side. Set NOMINATIM_URL to a
// self-hosted or commercial instance for heavier use.
const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org/search";
const USER_AGENT = process.env.GEO_USER_AGENT || "agriLease/1.0 (agricultural marketplace)";
const cache = new TtlCache<GeoSearchResult[]>(24 * 60 * 60 * 1000, 500);
let lastRequestAt = 0;

export class GeoSearchUnavailableError extends Error {}

export async function searchPlaces(query: string, language: string): Promise<GeoSearchResult[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const key = `${language}:${q.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const wait = lastRequestAt + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "ma");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", language);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
    if (!res.ok) throw new GeoSearchUnavailableError(`Place search failed (${res.status})`);
    const body = (await res.json()) as {
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      boundingbox?: [string, string, string, string];
    }[];
    const results: GeoSearchResult[] = body.map((r) => ({
      id: String(r.place_id),
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      bbox: r.boundingbox ? [Number(r.boundingbox[0]), Number(r.boundingbox[2]), Number(r.boundingbox[1]), Number(r.boundingbox[3])] : null,
    }));
    cache.set(key, results);
    return results;
  } catch (err) {
    if (err instanceof GeoSearchUnavailableError) throw err;
    throw new GeoSearchUnavailableError("Place search is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
