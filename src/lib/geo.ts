const METERS_PER_DEGREE_LAT = 111_320;
const EARTH_RADIUS_M = 6_371_008.8;

// Coordinates are WGS84 (EPSG:4326) everywhere in this app. Field polygons
// are stored as [lat, lng] pairs (the storage format predates the GeoJSON
// layers); anything handed to a map converts to GeoJSON's [lng, lat] order.
export type LatLng = [number, number];

// Derives a square polygon proportional to the actual area, rather than a fixed-size
// box, so user-created fields of different sizes render at plausibly different scales
// on the map. This is an ESTIMATE of where the field is, not its boundary; maps
// draw it dashed and say so (see isEstimatedPolygon).
export function squarePolygon(centerLat: number, centerLng: number, areaHectares: number): LatLng[] {
  const sideMeters = Math.sqrt(Math.max(areaHectares, 0.01) * 10_000);
  const halfSideMeters = sideMeters / 2;
  const halfLat = halfSideMeters / METERS_PER_DEGREE_LAT;
  const lngScale = Math.cos((centerLat * Math.PI) / 180) || 0.0001;
  const halfLng = halfSideMeters / (METERS_PER_DEGREE_LAT * lngScale);

  return [
    [centerLat - halfLat, centerLng - halfLng],
    [centerLat - halfLat, centerLng + halfLng],
    [centerLat + halfLat, centerLng + halfLng],
    [centerLat + halfLat, centerLng - halfLng],
    [centerLat - halfLat, centerLng - halfLng],
  ];
}

// True when the stored polygon is exactly the square squarePolygon() would
// generate for this field's centre and area, i.e. nobody has drawn the real
// boundary yet. Derived rather than stored, so it needs no schema change.
export function isEstimatedPolygon(
  polygon: LatLng[],
  centerLat: number,
  centerLng: number,
  areaHectares: number
): boolean {
  const square = squarePolygon(centerLat, centerLng, areaHectares);
  if (polygon.length !== square.length) return false;
  return polygon.every(([lat, lng], i) => Math.abs(lat - square[i][0]) < 1e-9 && Math.abs(lng - square[i][1]) < 1e-9);
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Geodesic area of a ring on a sphere, in hectares (accurate to well under 1%
// at field scale, which is far better than the hand-drawn outline itself).
export function polygonAreaHectares(ring: LatLng[]): number {
  if (ring.length < 4) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lat1, lng1] = ring[i];
    const [lat2, lng2] = ring[i + 1];
    sum +=
      ((lng2 - lng1) * Math.PI) / 180 *
      (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  return Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2) / 10_000;
}

export function polygonCentroid(ring: LatLng[]): LatLng {
  const pts = ring.length > 1 && samePoint(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring;
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lat, lng];
}

function samePoint(a: LatLng, b: LatLng) {
  return a[0] === b[0] && a[1] === b[1];
}

function segmentsIntersect(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d = (a: LatLng, b: LatLng, c: LatLng) => (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export type PolygonProblem = "TOO_FEW_POINTS" | "TOO_MANY_POINTS" | "INVALID_COORDINATE" | "SELF_INTERSECTING" | "TOO_LARGE";

// Checks a drawn field boundary. Returns a closed ring, or the reason it was
// rejected. Limits: 3-500 vertices, no crossing edges, under 10,000 ha (a
// single field larger than that is almost certainly a drawing mistake).
export function normalizeFieldPolygon(input: LatLng[]): { ring: LatLng[] } | { problem: PolygonProblem } {
  if (input.some(([lat, lng]) => !isValidLatLng(lat, lng))) return { problem: "INVALID_COORDINATE" };
  const open = input.length > 1 && samePoint(input[0], input[input.length - 1]) ? input.slice(0, -1) : input;
  if (open.length < 3) return { problem: "TOO_FEW_POINTS" };
  if (open.length > 500) return { problem: "TOO_MANY_POINTS" };
  const ring: LatLng[] = [...open, open[0]];
  for (let i = 0; i < ring.length - 1; i++) {
    for (let j = i + 2; j < ring.length - 1; j++) {
      if (i === 0 && j === ring.length - 2) continue; // first and last edges share a vertex
      if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) return { problem: "SELF_INTERSECTING" };
    }
  }
  if (polygonAreaHectares(ring) > 10_000) return { problem: "TOO_LARGE" };
  return { ring };
}

// Great-circle distance in kilometres.
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return (2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))) / 1000;
}

// Rounds a coordinate to ~1.1 km (two decimals). Used before showing another
// user's equipment position to farmers browsing the marketplace: close enough
// to judge distance, not precise enough to locate a parked machine.
export function approximateCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// Parses "south,west,north,east" and rejects boxes that are malformed or wider
// than maxSpanDeg in either direction (keeps upstream queries bounded).
export function parseBBox(raw: string | null, maxSpanDeg: number): BBox | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [south, west, north, east] = parts;
  if (!isValidLatLng(south, west) || !isValidLatLng(north, east)) return null;
  if (south >= north || west >= east) return null;
  if (north - south > maxSpanDeg || east - west > maxSpanDeg) return null;
  return { south, west, north, east };
}
