# Maps

How agriLease's maps work, where their data comes from, and what they deliberately do not show.

## Inventory

| Map | Where | For | Data | Interaction |
| --- | --- | --- | --- | --- |
| Farm parcels (overview) | Dashboard | Farmer | Own fields (`Field.polygon`) | Select a field → panel → open its farm |
| Farm parcels (manage) | `/farms/[id]` | Farmer | Fields of that farm; NASA HLS imagery | Select, draw/redraw a boundary, satellite image by date |
| Equipment route | `/equipment/[id]` | Owner, farmer | `EquipmentTrackPoint`, `currentLat/Lng` | Track, first fix, last position + time |
| Suppliers | `/maps/suppliers` | Farmer | Marketplace listings (≈1 km), OSM `shop=agrarian` | Search, material filter, layers, clustering, panel, distance, directions, list |
| Climate | `/maps/climate` | Farmer | NASA POWER (daily / monthly / climatology) | Pick up to 3 places, period, charts, table |
| Water | `/maps/water` | Farmer | OSM reservoirs, dams, rivers, canals, irrigation, wells, water points | Type filter, panel, list |
| Vegetation | `/maps/vegetation` | Farmer | NASA GIBS MODIS 16-day NDVI, HLS true colour | Period, last-year comparison, opacity |

Before this work there were two maps (field map, equipment route), both Leaflet with Carto raster tiles that now require an API key (they showed an "API KEY REQUIRED" watermark).

## Architecture

```
src/components/maps/          shared, no business logic
  BaseMap.tsx                 map lifecycle, controls, context
  maplibre.ts                 lazy loader, worker + RTL plugin URLs
  map-theme.ts                colour tokens, basemap tint, crop colours
  hooks.ts                    useGeoJsonLayer, useRasterLayer, useMapViewport
  MapPanel.tsx                details: side panel ≥640px, bottom sheet below
  MapLegend.tsx, MapStatus.tsx, MapSearch.tsx
  FarmMarkersLayer.tsx        the farmer's farms + initial view
  useOsmFeatures.ts           viewport-based OSM loading
  gibs.ts                     NASA GIBS tile URLs and dates
  MapPage.tsx                 frame for /maps/* pages
src/features/
  farms/components/FarmParcelsMap.tsx
  equipment/components/EquipmentRouteMap.tsx
  agricultural-materials/components/SuppliersMap.tsx
  climate/components/ClimateMap.tsx, ClimateCharts.tsx
  water-resources/components/WaterMap.tsx
  vegetation/components/VegetationMap.tsx
src/lib/  geo.ts, overpass.ts, nominatim.ts, nasaPower.ts, ttl-cache.ts
src/app/api/  geo/search, geo/osm, climate, marketplace/equipment/locations
```

- **Library:** `maplibre-gl` 6.16.0, used directly through `BaseMap` (no React wrapper library). One map instance per mount; resized with its container; `map.remove()` on unmount. MapLibre's ~1 MB is only downloaded on pages with a map.
- **Worker and RTL plugin:** `scripts/copy-maplibre-worker.mjs` copies MapLibre's worker and `@mapbox/mapbox-gl-rtl-text` 0.3.0 (Arabic label shaping) into `public/vendor/maplibre/` on install/dev/build. That folder is git-ignored.
- **Layers** are GeoJSON sources with data-driven paint; clustering is MapLibre's built-in GeoJSON clustering. No DOM markers.
- **Selection** uses feature-state (`selected`); the panel closes with ✕ or Escape and filters are kept.
- **Coordinates:** WGS84 everywhere. Field polygons are stored as `[lat, lng]`; GeoJSON uses `[lng, lat]` and conversion happens only at the layer boundary (`latLngRingToGeoJson`).

## Data sources

| Source | Used for | Licence / terms | Key |
| --- | --- | --- | --- |
| OpenFreeMap (OpenStreetMap, OpenMapTiles) | Basemap | ODbL data; free incl. production | none |
| NASA POWER | Climate | NASA open data | none |
| NASA GIBS: MODIS Terra MOD13 16-day NDVI (250 m) | Vegetation | NASA open data | none |
| NASA GIBS: HLS S30 true colour (30 m) | Satellite context | NASA open data | none |
| OpenStreetMap via Overpass | Water, supply shops | ODbL; public instances ask automated users to self-host | none |
| OpenStreetMap Nominatim | Place search | 1 req/s, identifying User-Agent, no autocomplete | none |

Environment variables (all optional) are listed in `.env.example`: `NEXT_PUBLIC_MAP_STYLE_URL`, `OVERPASS_URL`, `NOMINATIM_URL`, `GEO_USER_AGENT`.

Server-side caching: Overpass 24 h (by bbox snapped to 0.05°), Nominatim 24 h, NASA POWER 7 days. In-process only; a multi-instance deployment should move these to a shared cache.

## What the maps do not show, on purpose

- **Stock or availability at suppliers.** No source records it; the panel says "Stock not known".
- **Reservoir levels or water availability.** No reliable live source here.
- **A climate heatmap.** NASA POWER cells are about 50 km; at farm scale it would be a single flat colour presented as detail.
- **Forecasts.** The climate map is historical, modelled data, labelled as such.
- **Exact positions of other people's equipment.** Listings are rounded to ~1 km.
- **Crop health from NDVI.** NDVI is explained as greenness, with the reasons a low value can be harmless.
- **Field boundaries nobody drew.** Generated outlines are dashed and called "estimated".

## Known limitations

- Public Overpass instances are frequently at capacity. Without a self-hosted instance the water and supplier-shop layers will often show "unavailable" with a retry button.
- OpenStreetMap coverage of agricultural shops and rural water infrastructure in Morocco is incomplete.
- MODIS NDVI at 250 m is coarse for small fields; there is no field-level Sentinel-2 NDVI (that needs a Sentinel Hub / Copernicus Data Space account).
- HLS imagery is daily but a place is only covered every 2–5 days; some dates are blank or cloudy.
- No PostGIS: the app runs on SQLite in development, and current spatial needs are met in application code. Worth revisiting if spatial queries over many farms are needed.
- The demo seed draws fields as fixed-size squares that do not match their entered areas.
