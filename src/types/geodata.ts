// Shapes shared by the geodata API routes and the map features.
// Geometry follows GeoJSON (RFC 7946): WGS84, [longitude, latitude].

export type OsmLayer = "water" | "suppliers";

export type WaterResourceType = "RESERVOIR" | "DAM" | "RIVER" | "CANAL" | "IRRIGATION" | "WELL" | "WATER_POINT";
export const WATER_RESOURCE_TYPES: WaterResourceType[] = ["RESERVOIR", "DAM", "RIVER", "CANAL", "IRRIGATION", "WELL", "WATER_POINT"];

export type SupplierCategory = "SEEDS" | "FERTILIZER" | "PLANT_PROTECTION" | "EQUIPMENT" | "IRRIGATION" | "OTHER";
export const SUPPLIER_CATEGORIES: SupplierCategory[] = ["SEEDS", "FERTILIZER", "PLANT_PROTECTION", "EQUIPMENT", "IRRIGATION", "OTHER"];

type Position = [number, number];
export type OsmGeometry =
  | { type: "Point"; coordinates: Position }
  | { type: "LineString"; coordinates: Position[] }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

export interface OsmFeature {
  type: "Feature";
  id: string;
  geometry: OsmGeometry;
  properties: {
    osmId: string; // e.g. "node/123"
    kind: WaterResourceType | "SUPPLIER";
    categories?: SupplierCategory[];
    name: string | null;
    tags: Record<string, string>;
  };
}

export interface OsmFeatureCollection {
  type: "FeatureCollection";
  features: OsmFeature[];
  bbox: { south: number; west: number; north: number; east: number };
  attribution: string;
  fetchedAt: string;
}

export interface GeoSearchResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
  // [south, west, north, east] when the place is an area
  bbox: [number, number, number, number] | null;
}

// Equipment listed on the marketplace, placed at an approximate position.
export interface ListingLocation {
  id: string;
  name: string;
  category: string;
  listingType: "RENT" | "SALE" | "RENT_AND_SALE";
  dailyRateMad: number | null;
  salePrice: number | null;
  ownerRegion: string | null;
  // Rounded to ~1 km; never the machine's exact position.
  lat: number;
  lng: number;
}

export type ClimateMode = "daily" | "monthly" | "climatology";

export type ClimateVariable = "T2M" | "T2M_MAX" | "T2M_MIN" | "PRECTOTCORR" | "ALLSKY_SFC_SW_DWN" | "WS2M" | "RH2M";
export const CLIMATE_VARIABLES: ClimateVariable[] = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "WS2M", "RH2M"];

export interface ClimateSeries {
  lat: number;
  lng: number;
  mode: ClimateMode;
  // Period label per row: YYYY-MM-DD (daily), YYYY-MM (monthly) or JAN..DEC / ANN (climatology).
  rows: ({ period: string } & Partial<Record<ClimateVariable, number | null>>)[];
  units: Record<ClimateVariable, string>;
  source: string;
  // Spatial resolution of the underlying grid, in degrees (lat x lng).
  gridResolution: string;
  range: { start: string; end: string } | null;
  fetchedAt: string;
}
