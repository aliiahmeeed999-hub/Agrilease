import type { Map as MapLibreMap } from "maplibre-gl";

// Map design tokens. MapLibre paints with plain sRGB colours, so these are
// the hex equivalents of the app's oklch tokens in globals.css, plus a small
// set of layer colours chosen to stay distinguishable from each other and
// readable on the paper basemap.
export const MAP_COLORS = {
  paper: "#f6f2e9",
  ink: "#281c13",
  muted: "#62594f",
  border: "#ded8ce",
  olive: "#48621e",
  terracotta: "#b34f2a",
  blue: "#1764a0",
  ochre: "#975800",
  green: "#156f41",
  selected: "#b34f2a",
  water: "#c6dae6",
  waterLine: "#5b8db3",
  park: "#e4e9d2",
} as const;

// One colour per crop, used for fills (with transparency) and outlines.
export const CROP_COLORS: Record<string, string> = {
  WHEAT: "#c99a1e",
  BARLEY: "#9c7a3c",
  OLIVES: "#5d7a2a",
  CITRUS: "#d9771c",
  VEGETABLES: "#2f8a57",
  OTHER: "#8a8175",
};

// Base map: OpenFreeMap's "Positron" vector style (OpenStreetMap data, no API
// key, free for production use). Override with NEXT_PUBLIC_MAP_STYLE_URL to
// use a self-hosted or commercial tile service.
export const BASEMAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";

// Fallback view when nothing else is known: central Morocco (Fès-Meknès).
export const DEFAULT_CENTER: [number, number] = [-5.55, 33.9];

// Re-tints Positron's greys toward the app's limestone palette and shows
// labels in the interface language where OpenStreetMap has a translation.
export function applyBasemapTheme(map: MapLibreMap, language: string) {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", MAP_COLORS.paper);
      } else if (layer.type === "fill" && /water/.test(layer.id)) {
        map.setPaintProperty(layer.id, "fill-color", MAP_COLORS.water);
      } else if (layer.type === "line" && /waterway/.test(layer.id)) {
        map.setPaintProperty(layer.id, "line-color", MAP_COLORS.waterLine);
      } else if (layer.type === "fill" && /^(park|landcover_wood)$/.test(layer.id)) {
        map.setPaintProperty(layer.id, "fill-color", MAP_COLORS.park);
      } else if (
        layer.type === "symbol" &&
        layer.layout &&
        "text-field" in layer.layout &&
        // Only labels that show a place name; road shields show a route
        // number ("ref") and must keep it.
        /name/.test(JSON.stringify(layer.layout["text-field"])) &&
        !/"ref"/.test(JSON.stringify(layer.layout["text-field"]))
      ) {
        map.setLayoutProperty(layer.id, "text-field", [
          "coalesce",
          ["get", `name:${language}`],
          ["get", "name:latin"],
          ["get", "name"],
        ]);
      }
    } catch {
      // A layer the style changed or removed: leave it as the style defines it.
    }
  }
}

// GeoJSON uses [lng, lat]; field polygons are stored as [lat, lng].
export function latLngRingToGeoJson(ring: [number, number][]): [number, number][] {
  return ring.map(([lat, lng]) => [lng, lat]);
}
