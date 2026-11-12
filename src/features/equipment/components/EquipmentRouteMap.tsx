"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BaseMap } from "@/components/maps/BaseMap";
import { MapLegend } from "@/components/maps/MapLegend";
import { useGeoJsonLayer } from "@/components/maps/hooks";
import { MAP_COLORS } from "@/components/maps/map-theme";
import type { EquipmentTrackPointDto } from "@/types/equipment";

// Today's route for one machine: the track as a line, the first fix and the
// last reported position as distinct markers, and the time of the last
// report in the legend so "where is it now?" is never ambiguous.
export function EquipmentRouteMap({
  points,
  currentLat,
  currentLng,
}: {
  points: EquipmentTrackPointDto[];
  currentLat: number | null;
  currentLng: number | null;
}) {
  const t = useTranslations("routeMap");
  const [initialView] = useState(() => {
    const coords: [number, number][] = points.map((p) => [p.lng, p.lat]);
    if (currentLat !== null && currentLng !== null) coords.push([currentLng, currentLat]);
    if (coords.length === 0) return { center: [-5.55, 33.9] as [number, number], zoom: 12 };
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return {
      bounds: [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ] as [[number, number], [number, number]],
      maxZoom: 16,
    };
  });

  return (
    <BaseMap initialView={initialView} ariaLabel={t("ariaLabel")} cooperativeGestures>
      <RouteLayers points={points} currentLat={currentLat} currentLng={currentLng} />
    </BaseMap>
  );
}

function RouteLayers({
  points,
  currentLat,
  currentLng,
}: {
  points: EquipmentTrackPointDto[];
  currentLat: number | null;
  currentLng: number | null;
}) {
  const t = useTranslations("routeMap");
  const format = useFormatter();

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    if (points.length > 1) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
        properties: { fid: "track", kind: "track" },
      });
    }
    if (points.length > 0) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [points[0].lng, points[0].lat] },
        properties: { fid: "start", kind: "start" },
      });
    }
    if (currentLat !== null && currentLng !== null) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [currentLng, currentLat] },
        properties: { fid: "current", kind: "current" },
      });
    }
    return { type: "FeatureCollection", features };
  }, [points, currentLat, currentLng]);

  useGeoJsonLayer({
    id: "route",
    data,
    layers: [
      {
        id: "route-track-casing",
        type: "line",
        filter: ["==", ["get", "kind"], "track"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 6 },
      },
      {
        id: "route-track",
        type: "line",
        filter: ["==", ["get", "kind"], "track"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": MAP_COLORS.olive, "line-width": 3 },
      },
      {
        id: "route-start",
        type: "circle",
        filter: ["==", ["get", "kind"], "start"],
        paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": MAP_COLORS.olive, "circle-stroke-width": 2.5 },
      },
      {
        id: "route-current",
        type: "circle",
        filter: ["==", ["get", "kind"], "current"],
        paint: { "circle-radius": 7, "circle-color": MAP_COLORS.terracotta, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
      },
    ],
  });

  const last = points.at(-1);
  return (
    <MapLegend
      title={t("track")}
      defaultOpen={false}
      items={[
        { label: t("track"), swatch: { kind: "line", color: MAP_COLORS.olive } },
        { label: t("start"), swatch: { kind: "point", color: "#ffffff" } },
        { label: t("current"), swatch: { kind: "point", color: MAP_COLORS.terracotta } },
      ]}
      footer={last ? t("lastSeen", { time: format.dateTime(new Date(last.recordedAt), { hour: "2-digit", minute: "2-digit" }) }) : undefined}
    />
  );
}
