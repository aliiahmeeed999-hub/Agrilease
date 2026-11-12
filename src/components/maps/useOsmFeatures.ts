"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";
import type { Viewport } from "@/components/maps/hooks";
import type { OsmFeatureCollection, OsmLayer } from "@/types/geodata";

// Same limits as /api/geo/osm. Below minZoom or above the span the request
// is not made at all, and the map asks the user to zoom in instead.
const LIMITS: Record<OsmLayer, { minZoom: number; maxSpan: number }> = {
  water: { minZoom: 10, maxSpan: 0.6 },
  suppliers: { minZoom: 8, maxSpan: 1.5 },
};

function snap(v: number, down: boolean) {
  const s = 0.05;
  return (down ? Math.floor(v / s) : Math.ceil(v / s)) * s;
}

// OpenStreetMap features for the visible area. The bbox is snapped to a 0.05°
// grid (matching the server cache) so small pans reuse the cached response,
// and the previous result stays on the map while the next one loads.
export function useOsmFeatures(layer: OsmLayer, viewport: Viewport | null) {
  const { minZoom, maxSpan } = LIMITS[layer];
  const box = viewport
    ? {
        s: snap(viewport.south, true),
        w: snap(viewport.west, true),
        n: snap(viewport.north, false),
        e: snap(viewport.east, false),
      }
    : null;
  const tooFar = !viewport || viewport.zoom < minZoom || !box || box.n - box.s > maxSpan || box.e - box.w > maxSpan;
  const bbox = box ? [box.s, box.w, box.n, box.e].map((n) => n.toFixed(2)).join(",") : "";

  const query = useQuery({
    queryKey: ["geo", "osm", layer, bbox],
    queryFn: () => apiRequest<OsmFeatureCollection>(`/api/geo/osm?layer=${layer}&bbox=${bbox}`),
    enabled: !tooFar,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  return { ...query, tooFar };
}
