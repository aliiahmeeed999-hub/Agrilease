"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, LayerSpecification, MapLayerMouseEvent } from "maplibre-gl";
import { useMapContext } from "@/components/maps/BaseMap";

// Omit applied per member of the union, so each layer type keeps its own
// properties (filter, layout, paint...).
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type LayerDef = DistributiveOmit<Exclude<LayerSpecification, { type: "background" }>, "source">;

interface GeoJsonLayerOptions {
  // Source id; layer ids are namespaced under it.
  id: string;
  data: GeoJSON.FeatureCollection;
  layers: LayerDef[];
  // Layer ids (from `layers`) that respond to hover and click.
  interactiveLayers?: string[];
  // Property holding a stable string id, used for selection highlighting.
  idProperty?: string;
  selectedId?: string | null;
  onSelect?: (properties: Record<string, unknown> | null, layerId: string) => void;
  cluster?: { radius?: number; maxZoom?: number; clusterLayerId: string };
  beforeId?: string;
}

// Adds a GeoJSON source and its layers to the map from context. Data updates
// call setData (no re-adding); the source, layers and listeners are removed
// on unmount. Selected features get feature-state {selected: true}, which
// layer paint expressions can use to highlight them.
export function useGeoJsonLayer({
  id,
  data,
  layers,
  interactiveLayers = [],
  idProperty = "fid",
  selectedId,
  onSelect,
  cluster,
  beforeId,
}: GeoJsonLayerOptions) {
  const ctx = useMapContext();
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });
  const setup = useRef({ layers, interactiveLayers, idProperty, cluster, beforeId });

  useEffect(() => {
    if (!ctx) return;
    const { map } = ctx;
    const { layers: defs, interactiveLayers: interactive, idProperty: promoteId, cluster: clusterOpts, beforeId: before } = setup.current;
    map.addSource(id, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      promoteId,
      ...(clusterOpts ? { cluster: true, clusterRadius: clusterOpts.radius ?? 44, clusterMaxZoom: clusterOpts.maxZoom ?? 13 } : {}),
    });
    for (const def of defs) {
      map.addLayer({ ...def, source: id } as LayerSpecification, before && map.getLayer(before) ? before : undefined);
    }

    const handlers: [string, (e: MapLayerMouseEvent) => void, (e: MapLayerMouseEvent) => void, () => void][] = [];
    for (const layerId of interactive) {
      const click = async (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        if (clusterOpts && layerId === clusterOpts.clusterLayerId) {
          const source = map.getSource(id) as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id as number);
          map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
          return;
        }
        onSelectRef.current?.(feature.properties ?? null, layerId);
      };
      const enter = () => (map.getCanvas().style.cursor = "pointer");
      const leave = () => (map.getCanvas().style.cursor = "");
      map.on("click", layerId, click);
      map.on("mouseenter", layerId, enter);
      map.on("mouseleave", layerId, leave);
      handlers.push([layerId, click, enter, leave]);
    }

    return () => {
      // The map may already be gone if the whole BaseMap unmounted first.
      if (!map.getStyle()) return;
      for (const [layerId, click, enter, leave] of handlers) {
        map.off("click", layerId, click);
        map.off("mouseenter", layerId, enter);
        map.off("mouseleave", layerId, leave);
      }
      for (const def of [...defs].reverse()) if (map.getLayer(def.id)) map.removeLayer(def.id);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [ctx, id]);

  // Declared after the effect that adds the source, so on first mount the
  // source already exists when this runs (effects run in declaration order).
  useEffect(() => {
    if (!ctx) return;
    (ctx.map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
  }, [ctx, id, data]);

  // Selection highlight via feature-state.
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (!ctx || !ctx.map.getSource(id)) return;
    const { map } = ctx;
    if (previous.current !== null) map.setFeatureState({ source: id, id: previous.current }, { selected: false });
    if (selectedId) map.setFeatureState({ source: id, id: selectedId }, { selected: true });
    previous.current = selectedId ?? null;
  }, [ctx, id, selectedId, data]);
}

// A raster tile overlay (satellite imagery, NDVI). Changing `tiles` swaps the
// source in place; `visible` and `opacity` only touch paint/layout.
export function useRasterLayer({
  id,
  tiles,
  maxzoom,
  attribution,
  visible = true,
  opacity = 1,
  beforeId,
}: {
  id: string;
  tiles: string | null;
  maxzoom: number;
  attribution?: string;
  visible?: boolean;
  opacity?: number;
  beforeId?: string;
}) {
  const ctx = useMapContext();

  useEffect(() => {
    if (!ctx || !tiles) return;
    const { map } = ctx;
    const layerId = `${id}-layer`;
    map.addSource(id, { type: "raster", tiles: [tiles], tileSize: 256, maxzoom, attribution });
    // Under the first business layer (or labels) so outlines stay on top.
    const before = beforeId && map.getLayer(beforeId) ? beforeId : firstSymbolLayer(map);
    map.addLayer({ id: layerId, type: "raster", source: id, paint: { "raster-opacity": opacity, "raster-fade-duration": 150 } }, before);
    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(id)) map.removeSource(id);
    };
    // opacity/visibility are applied by the effect below without re-adding
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, id, tiles, maxzoom, attribution, beforeId]);

  useEffect(() => {
    if (!ctx || !tiles) return;
    const layerId = `${id}-layer`;
    if (!ctx.map.getLayer(layerId)) return;
    ctx.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    ctx.map.setPaintProperty(layerId, "raster-opacity", opacity);
  }, [ctx, id, tiles, visible, opacity]);
}

function firstSymbolLayer(map: NonNullable<ReturnType<typeof useMapContext>>["map"]) {
  return map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
}

export interface Viewport {
  south: number;
  west: number;
  north: number;
  east: number;
  zoom: number;
}

// The visible area, updated when the user stops moving the map (debounced),
// for loading data by viewport.
export function useMapViewport(debounceMs = 400): Viewport | null {
  const ctx = useMapContext();
  const [viewport, setViewport] = useState<Viewport | null>(null);

  useEffect(() => {
    if (!ctx) return;
    const { map } = ctx;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      const b = map.getBounds();
      setViewport({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast(), zoom: map.getZoom() });
    };
    const onMove = () => {
      clearTimeout(timer);
      timer = setTimeout(read, debounceMs);
    };
    read();
    map.on("moveend", onMove);
    return () => {
      clearTimeout(timer);
      map.off("moveend", onMove);
    };
  }, [ctx, debounceMs]);

  return viewport;
}
