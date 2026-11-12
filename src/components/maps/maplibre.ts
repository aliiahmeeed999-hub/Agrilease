"use client";

import maplibrePkg from "maplibre-gl/package.json";

type MapLibreModule = typeof import("maplibre-gl");

// The worker and the right-to-left text plugin are served from
// /vendor/maplibre (copied there by scripts/copy-maplibre-worker.mjs).
const WORKER_URL = `/vendor/maplibre/maplibre-gl-worker-${maplibrePkg.version}.mjs`;
// Keep in step with the exact @mapbox/mapbox-gl-rtl-text version in package.json.
const RTL_PLUGIN_URL = "/vendor/maplibre/rtl-text-0.3.0.js";

let loading: Promise<MapLibreModule> | null = null;

// Loads MapLibre once, only in the browser and only on pages that show a map
// (~1 MB of JS that the rest of the app never downloads).
export function loadMapLibre(): Promise<MapLibreModule> {
  loading ??= import("maplibre-gl").then((mod) => {
    mod.setWorkerUrl(WORKER_URL);
    // Arabic place names (common in Moroccan map data) need shaping and
    // right-to-left ordering, which MapLibre delegates to this plugin. Lazy:
    // it is only fetched when a label actually contains RTL text.
    if (mod.getRTLTextPluginStatus() === "unavailable") {
      mod.setRTLTextPlugin(RTL_PLUGIN_URL, true).catch(() => {
        // Labels still render, just unshaped; never block the map on this.
      });
    }
    return mod;
  });
  return loading;
}

export type { MapLibreModule };
