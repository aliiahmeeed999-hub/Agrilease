import { TtlCache } from "@/lib/ttl-cache";
import type { BBox } from "@/lib/geo";
import type { OsmFeature, OsmFeatureCollection, OsmLayer, SupplierCategory, WaterResourceType } from "@/types/geodata";

// OpenStreetMap data via the Overpass API.
//
// Data is community-mapped (ODbL): real places, but coverage in rural Morocco
// is incomplete and nothing here is "verified" in an official sense. Every
// response carries that attribution, and the UI says so.
//
// The public endpoints are for light, human-driven use and are often at
// capacity. Production deployments should run their own Overpass instance
// and set OVERPASS_URL (a comma-separated list is tried in order).
const OVERPASS_URLS = (process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
const USER_AGENT = process.env.GEO_USER_AGENT || "agriLease/1.0 (agricultural marketplace)";
const TIMEOUT_MS = 20_000;
const cache = new TtlCache<OsmFeatureCollection>(24 * 60 * 60 * 1000, 300);

export class OverpassUnavailableError extends Error {}

function bboxClause(b: BBox) {
  return `(${b.south},${b.west},${b.north},${b.east})`;
}

// Snaps a bbox outward to a 0.05° grid so small pans reuse the same cache entry.
export function snapBBox(b: BBox): BBox {
  const s = 0.05;
  return {
    south: Math.floor(b.south / s) * s,
    west: Math.floor(b.west / s) * s,
    north: Math.ceil(b.north / s) * s,
    east: Math.ceil(b.east / s) * s,
  };
}

function waterQuery(b: BBox) {
  const bb = bboxClause(b);
  return `[out:json][timeout:25];(
  nwr["water"="reservoir"]${bb};
  nwr["landuse"="reservoir"]${bb};
  nwr["waterway"="dam"]${bb};
  way["waterway"="river"]${bb};
  way["waterway"="canal"]${bb};
  way["waterway"~"^(ditch|drain)$"]["usage"="irrigation"]${bb};
  nwr["man_made"="water_well"]${bb};
  nwr["amenity"="water_point"]${bb};
);out geom tags;`;
}

function suppliersQuery(b: BBox) {
  const bb = bboxClause(b);
  return `[out:json][timeout:25];(
  nwr["shop"="agrarian"]${bb};
  nwr["shop"="agricultural"]${bb};
  nwr["shop"="farm_supply"]${bb};
);out center tags;`;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; role: string; geometry?: { lat: number; lon: number }[] }[];
  tags?: Record<string, string>;
}

function classifyWater(tags: Record<string, string>): WaterResourceType | null {
  if (tags.water === "reservoir" || tags.landuse === "reservoir") return "RESERVOIR";
  if (tags.waterway === "dam") return "DAM";
  if (tags.waterway === "river") return "RIVER";
  if (tags.waterway === "canal") return tags.usage === "irrigation" ? "IRRIGATION" : "CANAL";
  if ((tags.waterway === "ditch" || tags.waterway === "drain") && tags.usage === "irrigation") return "IRRIGATION";
  if (tags.man_made === "water_well") return "WELL";
  if (tags.amenity === "water_point") return "WATER_POINT";
  return null;
}

// OSM's agrarian=* lists what a shop sells, separated by ";". Mapped onto the
// platform's material categories; anything else falls under OTHER.
function classifySupplier(tags: Record<string, string>): SupplierCategory[] {
  const sells = (tags.agrarian ?? "").toLowerCase().split(";").map((s) => s.trim());
  const cats = new Set<SupplierCategory>();
  for (const s of sells) {
    if (s === "seed" || s === "seeds" || s === "seedlings") cats.add("SEEDS");
    else if (s === "fertilizer" || s === "fertiliser") cats.add("FERTILIZER");
    else if (s === "pesticide" || s === "herbicide" || s === "fungicide") cats.add("PLANT_PROTECTION");
    else if (s === "agricultural_machinery" || s === "machine_parts" || s === "tools") cats.add("EQUIPMENT");
    else if (s === "irrigation") cats.add("IRRIGATION");
    else if (s) cats.add("OTHER");
  }
  if (cats.size === 0) cats.add("OTHER");
  return [...cats];
}

function toCoords(points: { lat: number; lon: number }[]) {
  return points.map((p) => [p.lon, p.lat] as [number, number]);
}

function elementGeometry(el: OverpassElement): OsmFeature["geometry"] | null {
  if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
    return { type: "Point", coordinates: [el.lon, el.lat] };
  }
  if (el.type === "way" && el.geometry && el.geometry.length > 1) {
    const coords = toCoords(el.geometry);
    const first = coords[0];
    const last = coords[coords.length - 1];
    const closed = first[0] === last[0] && first[1] === last[1];
    const tags = el.tags ?? {};
    const isArea = closed && (tags.water === "reservoir" || tags.landuse === "reservoir" || tags.area === "yes");
    return isArea ? { type: "Polygon", coordinates: [coords] } : { type: "LineString", coordinates: coords };
  }
  if (el.type === "relation" && el.members) {
    const outers = el.members.filter((m) => m.role === "outer" && m.geometry && m.geometry.length > 3);
    if (outers.length === 0) return null;
    return { type: "MultiPolygon", coordinates: outers.map((m) => [toCoords(m.geometry!)]) };
  }
  if (el.center) return { type: "Point", coordinates: [el.center.lon, el.center.lat] };
  return null;
}

async function runQuery(query: string): Promise<OverpassElement[]> {
  // Each endpoint once, with a short pause between: public instances answer
  // 429/502/504 when busy, often within milliseconds.
  for (let attempt = 0; attempt < OVERPASS_URLS.length; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(OVERPASS_URLS[attempt], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (res.ok) {
        const body = await res.json();
        return body.elements ?? [];
      }
      if (![429, 502, 503, 504].includes(res.status) && res.status < 500) break;
    } catch {
      // network error or timeout: fall through to retry
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < OVERPASS_URLS.length - 1) await new Promise((r) => setTimeout(r, 1000));
  }
  throw new OverpassUnavailableError("OpenStreetMap data service is unavailable");
}

export async function fetchOsmLayer(layer: OsmLayer, bbox: BBox): Promise<OsmFeatureCollection> {
  const snapped = snapBBox(bbox);
  const key = `${layer}:${snapped.south.toFixed(2)},${snapped.west.toFixed(2)},${snapped.north.toFixed(2)},${snapped.east.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const elements = await runQuery(layer === "water" ? waterQuery(snapped) : suppliersQuery(snapped));
  const features: OsmFeature[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const geometry = elementGeometry(el);
    if (!geometry) continue;
    const id = `${el.type}/${el.id}`;
    if (layer === "water") {
      const kind = classifyWater(tags);
      if (!kind) continue;
      features.push({ type: "Feature", id, geometry, properties: { osmId: id, kind, name: tags.name ?? tags["name:fr"] ?? tags["name:ar"] ?? null, tags } });
    } else {
      // Suppliers are shown as points even when mapped as a building outline.
      const point: OsmFeature["geometry"] | null =
        geometry.type === "Point"
          ? geometry
          : el.center
            ? { type: "Point", coordinates: [el.center.lon, el.center.lat] }
            : null;
      if (!point) continue;
      features.push({
        type: "Feature",
        id,
        geometry: point,
        properties: { osmId: id, kind: "SUPPLIER", categories: classifySupplier(tags), name: tags.name ?? tags["name:fr"] ?? tags["name:ar"] ?? null, tags },
      });
    }
  }

  const collection: OsmFeatureCollection = {
    type: "FeatureCollection",
    features,
    bbox: snapped,
    attribution: "© OpenStreetMap contributors (ODbL)",
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, collection);
  return collection;
}
