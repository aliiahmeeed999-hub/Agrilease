"use client";

import { useMemo } from "react";
import { useGeoJsonLayer } from "@/components/maps/hooks";
import { MAP_COLORS } from "@/components/maps/map-theme";
import type { MapInitialView } from "@/components/maps/BaseMap";
import type { FarmListItem } from "@/types/farm";

// The signed-in farmer's own farms, as reference points on every map
// ("where am I relative to this?"). Not interactive; labelled from zoom 9.
export function FarmMarkersLayer({ farms, beforeId }: { farms: FarmListItem[]; beforeId?: string }) {
  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: farms.map((f) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
        properties: { fid: f.id, name: f.name },
      })),
    }),
    [farms]
  );

  useGeoJsonLayer({
    id: "my-farms",
    data,
    beforeId,
    layers: [
      {
        id: "my-farms-point",
        type: "circle",
        paint: {
          "circle-radius": 7,
          "circle-color": MAP_COLORS.ink,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      },
      {
        id: "my-farms-label",
        type: "symbol",
        minzoom: 9,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: { "text-color": MAP_COLORS.ink, "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      },
    ],
  });
  return null;
}

// Starting view: around the farmer's farms (with room for what is nearby),
// or the whole of Morocco when they have none yet.
export function initialViewForFarms(farms: FarmListItem[], paddingDeg = 0.15): MapInitialView {
  if (farms.length === 0) return { bounds: [[-13.2, 27.6], [-1, 35.95]] };
  const lngs = farms.map((f) => f.longitude);
  const lats = farms.map((f) => f.latitude);
  return {
    bounds: [
      [Math.min(...lngs) - paddingDeg, Math.min(...lats) - paddingDeg],
      [Math.max(...lngs) + paddingDeg, Math.max(...lats) + paddingDeg],
    ],
    maxZoom: 13,
  };
}
