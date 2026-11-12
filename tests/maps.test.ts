import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  approximateCoordinate,
  haversineKm,
  isEstimatedPolygon,
  normalizeFieldPolygon,
  parseBBox,
  polygonAreaHectares,
  squarePolygon,
  type LatLng,
} from "@/lib/geo";
import { PATCH as patchField } from "@/app/api/fields/[id]/route";
import { GET as getClimate } from "@/app/api/climate/route";
import { GET as getOsm } from "@/app/api/geo/osm/route";
import { GET as getListingLocations } from "@/app/api/marketplace/equipment/locations/route";
import { createTestUser, jsonRequest, loginAs } from "./helpers";

describe("geometry helpers", () => {
  it("measures a generated square at the area it was generated for", () => {
    const sq = squarePolygon(33.9, -5.55, 12.5);
    expect(polygonAreaHectares(sq)).toBeCloseTo(12.5, 1);
  });

  it("recognises the generated square, and nothing else, as estimated", () => {
    const sq = squarePolygon(33.9, -5.55, 10);
    expect(isEstimatedPolygon(sq, 33.9, -5.55, 10)).toBe(true);
    expect(isEstimatedPolygon(sq, 33.9, -5.55, 11)).toBe(false);
    const drawn: LatLng[] = [[33.9, -5.55], [33.91, -5.55], [33.905, -5.54], [33.9, -5.55]];
    expect(isEstimatedPolygon(drawn, 33.9, -5.55, 10)).toBe(false);
  });

  it("closes an open ring and rejects bad boundaries", () => {
    const open: LatLng[] = [[33.9, -5.55], [33.91, -5.55], [33.905, -5.54]];
    const ok = normalizeFieldPolygon(open);
    expect("ring" in ok && ok.ring.length).toBe(4);
    expect(normalizeFieldPolygon([[33.9, -5.55], [33.91, -5.55]])).toEqual({ problem: "TOO_FEW_POINTS" });
    expect(normalizeFieldPolygon([[95, -5.55], [33.91, -5.55], [33.905, -5.54]])).toEqual({ problem: "INVALID_COORDINATE" });
    // a bow-tie: edges cross
    const bowtie: LatLng[] = [[0, 0], [1, 1], [1, 0], [0, 1]];
    expect(normalizeFieldPolygon(bowtie)).toEqual({ problem: "SELF_INTERSECTING" });
  });

  it("approximates coordinates to about a kilometre", () => {
    expect(approximateCoordinate(33.89567)).toBe(33.9);
    expect(haversineKm([33.89567, -5.54321], [approximateCoordinate(33.89567), approximateCoordinate(-5.54321)])).toBeLessThan(1);
  });

  it("parses a bbox and refuses oversized or inverted ones", () => {
    expect(parseBBox("33.8,-5.6,34.0,-5.4", 1)).toEqual({ south: 33.8, west: -5.6, north: 34, east: -5.4 });
    expect(parseBBox("33.8,-5.6,35.0,-5.4", 1)).toBeNull();
    expect(parseBBox("34.0,-5.6,33.8,-5.4", 1)).toBeNull();
    expect(parseBBox("nonsense", 1)).toBeNull();
  });
});

async function farmWithField() {
  const { user } = await createTestUser({ role: "FARMER" });
  await loginAs(user);
  const farm = await prisma.farm.create({
    data: { ownerId: user.id, name: "Map Farm", region: "Fès-Meknès", sizeHectares: 40, latitude: 33.9, longitude: -5.55 },
  });
  const field = await prisma.field.create({
    data: {
      farmId: farm.id,
      name: "North",
      cropType: "WHEAT",
      areaHectares: 10,
      centerLat: 33.9,
      centerLng: -5.55,
      polygon: squarePolygon(33.9, -5.55, 10),
    },
  });
  return { user, farm, field };
}

const drawn: LatLng[] = [
  [33.9, -5.55],
  [33.902, -5.55],
  [33.902, -5.547],
  [33.9, -5.547],
];

describe("PATCH /api/fields/[id] with a drawn boundary", () => {
  it("stores the closed ring, moves the centre to it, and reports it as drawn", async () => {
    const { field } = await farmWithField();
    const res = await patchField(jsonRequest(`/api/fields/${field.id}`, "PATCH", { polygon: drawn }), { params: Promise.resolve({ id: field.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.polygon).toHaveLength(5);
    expect(body.data.boundaryEstimated).toBe(false);
    expect(body.data.centerLat).toBeCloseTo(33.901, 3);
    expect(body.data.areaHectares).toBe(10); // the entered area is left as entered
  });

  it("keeps a drawn boundary when the area is edited (it used to be replaced by a square)", async () => {
    const { field } = await farmWithField();
    await patchField(jsonRequest(`/api/fields/${field.id}`, "PATCH", { polygon: drawn }), { params: Promise.resolve({ id: field.id }) });
    const res = await patchField(jsonRequest(`/api/fields/${field.id}`, "PATCH", { areaHectares: 12 }), { params: Promise.resolve({ id: field.id }) });
    const body = await res.json();
    expect(body.data.polygon).toHaveLength(5);
    expect(body.data.polygon[1]).toEqual(drawn[1]);
  });

  it("still regenerates an estimated outline when the area changes", async () => {
    const { field } = await farmWithField();
    const res = await patchField(jsonRequest(`/api/fields/${field.id}`, "PATCH", { areaHectares: 20 }), { params: Promise.resolve({ id: field.id }) });
    const body = await res.json();
    expect(body.data.boundaryEstimated).toBe(true);
    expect(polygonAreaHectares(body.data.polygon)).toBeCloseTo(20, 0);
  });

  it("rejects a self-intersecting boundary with a readable reason", async () => {
    const { field } = await farmWithField();
    const bowtie: LatLng[] = [[33.9, -5.55], [33.902, -5.547], [33.902, -5.55], [33.9, -5.547]];
    const res = await patchField(jsonRequest(`/api/fields/${field.id}`, "PATCH", { polygon: bowtie }), { params: Promise.resolve({ id: field.id }) });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("INVALID_POLYGON");
  });

  it("does not let another farmer draw on someone else's field", async () => {
    const { field } = await farmWithField();
    const { user: other } = await createTestUser({ role: "FARMER" });
    await loginAs(other);
    const res = await patchField(jsonRequest(`/api/fields/${field.id}`, "PATCH", { polygon: drawn }), { params: Promise.resolve({ id: field.id }) });
    expect(res.status).toBe(404);
  });
});

function getReq(path: string) {
  return new NextRequest(new URL(path, "http://localhost"));
}

describe("GET /api/climate", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects bad coordinates, ranges over a year, and unknown modes before calling NASA", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    await loginAs(user);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect((await getClimate(getReq("/api/climate?mode=daily&lat=120&lng=-5&start=2024-01-01&end=2024-01-10"))).status).toBe(422);
    expect((await getClimate(getReq("/api/climate?mode=daily&lat=33.9&lng=-5.5&start=2023-01-01&end=2024-06-01"))).status).toBe(422);
    expect((await getClimate(getReq("/api/climate?mode=hourly&lat=33.9&lng=-5.5"))).status).toBe(422);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("turns NASA POWER fill values into gaps, not zeros, and reports units and source", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    await loginAs(user);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            header: { sources: ["MERRA2"], start: "20240101", end: "20240102" },
            parameters: { T2M: { units: "C" }, PRECTOTCORR: { units: "mm/day" } },
            properties: { parameter: { T2M: { "20240101": 11.2, "20240102": -999 }, PRECTOTCORR: { "20240101": 0, "20240102": 3.4 } } },
          }),
          { status: 200 }
        )
      )
    );
    const res = await getClimate(getReq("/api/climate?mode=daily&lat=33.123&lng=-5.456&start=2024-01-01&end=2024-01-02"));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.rows).toEqual([
      expect.objectContaining({ period: "2024-01-01", T2M: 11.2, PRECTOTCORR: 0 }),
      expect.objectContaining({ period: "2024-01-02", T2M: null, PRECTOTCORR: 3.4 }),
    ]);
    expect(data.units.T2M).toBe("°C");
    expect(data.source).toContain("NASA POWER");
  });
});

describe("GET /api/geo/osm", () => {
  it("refuses a bounding box wider than the layer allows", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    await loginAs(user);
    const res = await getOsm(getReq("/api/geo/osm?layer=water&bbox=33,-6,34.5,-4.5"));
    expect(res.status).toBe(422);
  });

  it("is not available to bankers", async () => {
    const { user } = await createTestUser({ role: "BANKER" });
    await loginAs(user);
    const res = await getOsm(getReq("/api/geo/osm?layer=water&bbox=33.8,-5.6,34,-5.4"));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/marketplace/equipment/locations", () => {
  it("returns listed equipment at an approximate position and leaves out unlisted or unplaced machines", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const base = { ownerId: owner.id, type: "TRACTOR" as const, manufacturer: "JD", model: "6R", enginePowerHp: 150, hitchCapacityKg: 1000, maxSpeedKmh: 30 };
    const placed = await prisma.equipment.create({ data: { ...base, name: "Placed", isListed: true, listingType: "RENT", dailyRateMad: 900, currentLat: 33.895678, currentLng: -5.543219 } });
    const unplaced = await prisma.equipment.create({ data: { ...base, name: "Unplaced", isListed: true, listingType: "RENT", dailyRateMad: 900 } });
    const unlisted = await prisma.equipment.create({ data: { ...base, name: "Unlisted", isListed: false, currentLat: 33.9, currentLng: -5.5 } });

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);
    const res = await getListingLocations();
    const { data } = await res.json();
    const ids = data.locations.map((l: { id: string }) => l.id);
    expect(ids).toContain(placed.id);
    expect(ids).not.toContain(unplaced.id);
    expect(ids).not.toContain(unlisted.id);
    const loc = data.locations.find((l: { id: string }) => l.id === placed.id);
    expect(loc.lat).toBe(33.9);
    expect(loc.lng).toBe(-5.54);
  });
});

describe("fetchOsmLayer (Overpass → GeoJSON)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("classifies water features by tag and builds the right geometry for each", async () => {
    const { fetchOsmLayer } = await import("@/lib/overpass");
    const ring = [
      { lat: 33.9, lon: -5.5 },
      { lat: 33.91, lon: -5.5 },
      { lat: 33.91, lon: -5.49 },
      { lat: 33.9, lon: -5.5 },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            elements: [
              { type: "node", id: 1, lat: 33.95, lon: -5.52, tags: { man_made: "water_well", name: "Bir A" } },
              { type: "way", id: 2, geometry: [{ lat: 33.9, lon: -5.6 }, { lat: 33.92, lon: -5.58 }], tags: { waterway: "river", name: "Oued B" } },
              { type: "way", id: 3, geometry: ring, tags: { water: "reservoir" } },
              { type: "way", id: 4, geometry: [{ lat: 33.9, lon: -5.6 }, { lat: 33.9, lon: -5.59 }], tags: { waterway: "ditch", usage: "irrigation" } },
              { type: "relation", id: 5, members: [{ type: "way", role: "outer", geometry: ring }], tags: { landuse: "reservoir" } },
              { type: "node", id: 6, lat: 33.9, lon: -5.5, tags: { amenity: "bench" } },
            ],
          }),
          { status: 200 }
        )
      )
    );
    const fc = await fetchOsmLayer("water", { south: 33.8, west: -5.7, north: 34.0, east: -5.4 });
    const byId = Object.fromEntries(fc.features.map((f) => [f.id, f]));
    expect(byId["node/1"].properties.kind).toBe("WELL");
    expect(byId["node/1"].geometry).toEqual({ type: "Point", coordinates: [-5.52, 33.95] });
    expect(byId["way/2"].geometry.type).toBe("LineString");
    expect(byId["way/3"].geometry.type).toBe("Polygon");
    expect(byId["way/4"].properties.kind).toBe("IRRIGATION");
    expect(byId["relation/5"].geometry.type).toBe("MultiPolygon");
    expect(byId["node/6"]).toBeUndefined(); // unrelated features are dropped
    expect(fc.attribution).toContain("OpenStreetMap");
  });

  it("maps agrarian=* to material categories and places shops at their centre", async () => {
    const { fetchOsmLayer } = await import("@/lib/overpass");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            elements: [
              { type: "node", id: 10, lat: 33.5, lon: -5.1, tags: { shop: "agrarian", agrarian: "seed;fertilizer;pesticide", name: "Agri Sud" } },
              { type: "way", id: 11, center: { lat: 33.6, lon: -5.2 }, tags: { shop: "agrarian", agrarian: "irrigation" } },
              { type: "node", id: 12, lat: 33.7, lon: -5.3, tags: { shop: "agrarian" } },
            ],
          }),
          { status: 200 }
        )
      )
    );
    const fc = await fetchOsmLayer("suppliers", { south: 33.1, west: -5.9, north: 34.0, east: -4.9 });
    const byId = Object.fromEntries(fc.features.map((f) => [f.id, f]));
    expect(byId["node/10"].properties.categories).toEqual(["SEEDS", "FERTILIZER", "PLANT_PROTECTION"]);
    expect(byId["way/11"].geometry).toEqual({ type: "Point", coordinates: [-5.2, 33.6] });
    expect(byId["way/11"].properties.categories).toEqual(["IRRIGATION"]);
    expect(byId["node/12"].properties.categories).toEqual(["OTHER"]);
  });

  it("reports the service as unavailable when every endpoint is busy", async () => {
    const { fetchOsmLayer, OverpassUnavailableError } = await import("@/lib/overpass");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("busy", { status: 504 })));
    await expect(fetchOsmLayer("water", { south: 30.0, west: -9.0, north: 30.1, east: -8.9 })).rejects.toBeInstanceOf(OverpassUnavailableError);
  });
});
