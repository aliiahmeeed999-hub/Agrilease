"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Check, PenLine, Satellite, Undo2, X } from "lucide-react";
import type { MapMouseEvent } from "maplibre-gl";
import { Link } from "@/i18n/navigation";
import { BaseMap, useMapContext } from "@/components/maps/BaseMap";
import { MapPanel, MapPanelRow } from "@/components/maps/MapPanel";
import { MapLegend } from "@/components/maps/MapLegend";
import { useGeoJsonLayer, useRasterLayer } from "@/components/maps/hooks";
import { CROP_COLORS, MAP_COLORS, latLngRingToGeoJson } from "@/components/maps/map-theme";
import { daysAgo, GIBS_ATTRIBUTION, hlsTrueColorTiles, HLS_MAX_ZOOM } from "@/components/maps/gibs";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { polygonAreaHectares, type LatLng } from "@/lib/geo";
import { updateField } from "@/services/farm.service";
import { ApiError } from "@/services/api-client";
import { formatDayLabel } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { CropType, FieldStatus } from "@/generated/prisma/enums";

export interface ParcelField {
  id: string;
  farmId?: string;
  name: string;
  cropType: CropType;
  status: FieldStatus;
  areaHectares: number;
  centerLat: number;
  centerLng: number;
  polygon: [number, number][];
  boundaryEstimated: boolean;
  plantedAt?: string | null;
  expectedHarvestAt?: string | null;
}

interface FarmParcelsMapProps {
  fields: ParcelField[];
  // "overview": read-only, every field links to its farm (dashboard).
  // "manage": boundaries can be drawn, satellite imagery available (farm page).
  mode: "overview" | "manage";
  farmId?: string;
  // Used when there are no fields yet.
  fallbackCenter?: [number, number]; // [lng, lat]
  className?: string;
}

function boundsOf(fields: ParcelField[]): [[number, number], [number, number]] | null {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const f of fields) {
    for (const [lat, lng] of f.polygon) {
      w = Math.min(w, lng);
      e = Math.max(e, lng);
      s = Math.min(s, lat);
      n = Math.max(n, lat);
    }
  }
  return Number.isFinite(w) ? [[w, s], [e, n]] : null;
}

export function FarmParcelsMap({ fields, mode, farmId, fallbackCenter, className }: FarmParcelsMapProps) {
  const t = useTranslations("farmMap");
  const bounds = useMemo(() => boundsOf(fields), [fields]);
  // Captured once: the view resets to where the map started, not to wherever
  // the field list happens to be after an edit.
  const [initialView] = useState(() =>
    bounds ? { bounds, maxZoom: 16 } : { center: fallbackCenter ?? ([-5.55, 33.9] as [number, number]), zoom: bounds ? 14 : 12 }
  );
  const estimatedCount = fields.filter((f) => f.boundaryEstimated).length;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative h-full min-h-72 flex-1">
        <BaseMap initialView={initialView} ariaLabel={t("ariaLabel")} cooperativeGestures>
          <ParcelLayers fields={fields} mode={mode} farmId={farmId} />
        </BaseMap>
      </div>
      {estimatedCount > 0 && mode === "manage" && (
        <p className="text-sm leading-snug text-muted-foreground">{t("estimatedNotice", { count: estimatedCount })}</p>
      )}
    </div>
  );
}

function ParcelLayers({ fields, mode, farmId }: { fields: ParcelField[]; mode: "overview" | "manage"; farmId?: string }) {
  const t = useTranslations("farmMap");
  const tCommon = useTranslations("common");
  const ctx = useMapContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<LatLng[] | null>(null); // [lat, lng] while drawing
  const [showSatellite, setShowSatellite] = useState(false);
  const [imageDate, setImageDate] = useState(() => daysAgo(4));

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: fields
        .filter((f) => f.polygon.length >= 4)
        .map((f) => ({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [latLngRingToGeoJson(f.polygon)] },
          properties: {
            fid: f.id,
            name: f.name,
            color: CROP_COLORS[f.cropType] ?? CROP_COLORS.OTHER,
            estimated: f.boundaryEstimated,
          },
        })),
    }),
    [fields]
  );

  useGeoJsonLayer({
    id: "fields",
    data,
    interactiveLayers: ["fields-fill"],
    selectedId: drawing ? null : selectedId,
    onSelect: (props) => {
      if (drawing) return;
      setSelectedId((props?.fid as string) ?? null);
    },
    layers: [
      {
        id: "fields-fill",
        type: "fill",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.55, 0.32],
        },
      },
      {
        id: "fields-outline-drawn",
        type: "line",
        filter: ["!", ["get", "estimated"]],
        paint: { "line-color": ["get", "color"], "line-width": 2 },
      },
      {
        // Generated outlines are dashed: they show roughly where and how big
        // the field is, not its real shape.
        id: "fields-outline-estimated",
        type: "line",
        filter: ["get", "estimated"],
        paint: { "line-color": ["get", "color"], "line-width": 1.75, "line-dasharray": [2, 1.5] },
      },
      {
        // feature-state cannot be used in filters, so unselected outlines
        // simply have zero width.
        id: "fields-selected",
        type: "line",
        paint: {
          "line-color": MAP_COLORS.selected,
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 0],
        },
      },
      {
        id: "fields-label",
        type: "symbol",
        minzoom: 13,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-max-width": 8,
        },
        paint: { "text-color": MAP_COLORS.ink, "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      },
    ],
  });

  // Satellite context imagery under the field outlines.
  useRasterLayer({
    id: "hls",
    tiles: showSatellite ? hlsTrueColorTiles(imageDate) : null,
    maxzoom: HLS_MAX_ZOOM,
    attribution: GIBS_ATTRIBUTION,
    beforeId: "fields-fill",
  });

  // Boundary drawing: each click adds a corner.
  const addPoint = useCallback((e: MapMouseEvent) => {
    setDrawing((pts) => (pts ? [...pts, [e.lngLat.lat, e.lngLat.lng]] : pts));
  }, []);
  useEffect(() => {
    if (!ctx || !drawing) return;
    const { map } = ctx;
    map.on("click", addPoint);
    map.getCanvas().style.cursor = "crosshair";
    map.doubleClickZoom.disable();
    return () => {
      map.off("click", addPoint);
      map.getCanvas().style.cursor = "";
      map.doubleClickZoom.enable();
    };
  }, [ctx, drawing !== null, addPoint]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawData = useMemo<GeoJSON.FeatureCollection>(() => {
    const pts = drawing ?? [];
    const coords = pts.map(([lat, lng]) => [lng, lat]);
    const features: GeoJSON.Feature[] = pts.map(([lat, lng], i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { fid: `v${i}` },
    }));
    if (pts.length >= 2) {
      features.push({
        type: "Feature",
        geometry: pts.length >= 3 ? { type: "Polygon", coordinates: [[...coords, coords[0]]] } : { type: "LineString", coordinates: coords },
        properties: { fid: "shape" },
      });
    }
    return { type: "FeatureCollection", features };
  }, [drawing]);

  useGeoJsonLayer({
    id: "draw",
    data: drawData,
    layers: [
      { id: "draw-fill", type: "fill", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": MAP_COLORS.terracotta, "fill-opacity": 0.18 } },
      { id: "draw-line", type: "line", filter: ["!=", ["geometry-type"], "Point"], paint: { "line-color": MAP_COLORS.terracotta, "line-width": 2.5 } },
      {
        id: "draw-vertex",
        type: "circle",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": MAP_COLORS.terracotta, "circle-stroke-width": 2.5 },
      },
    ],
  });

  const legendItems = useMemo(() => {
    const crops = [...new Set(fields.map((f) => f.cropType))];
    return [
      ...crops.map((c) => ({ label: tCommon(`crop.${c}`), swatch: { kind: "fill" as const, color: CROP_COLORS[c] ?? CROP_COLORS.OTHER } })),
      { label: t("legendDrawn"), swatch: { kind: "line" as const, color: MAP_COLORS.muted, width: 2 } },
      { label: t("legendEstimated"), swatch: { kind: "line" as const, color: MAP_COLORS.muted, dashed: true, width: 2 } },
    ];
  }, [fields, t, tCommon]);

  return (
    <>
      {fields.length > 0 && !drawing && <MapLegend title={t("title")} items={legendItems} defaultOpen={false} />}

      {mode === "manage" && !drawing && (
        <div className="absolute start-3 top-3 z-[6] flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={showSatellite}
            onClick={() => setShowSatellite((v) => !v)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors",
              showSatellite ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            <Satellite className="size-4" aria-hidden="true" />
            {t("satellite")}
          </button>
          {showSatellite && (
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm shadow-sm">
              <span className="text-muted-foreground">{t("satelliteDate")}</span>
              <input
                type="date"
                value={imageDate}
                max={daysAgo(1)}
                min="2015-12-01"
                onChange={(e) => e.target.value && setImageDate(e.target.value)}
                className="bg-transparent text-sm outline-none"
              />
            </label>
          )}
        </div>
      )}
      {mode === "manage" && showSatellite && !drawing && (
        <p className="absolute inset-x-3 bottom-8 z-[4] ms-auto max-w-sm rounded-lg bg-card/95 px-3 py-2 text-xs leading-snug text-muted-foreground shadow-sm sm:inset-x-auto sm:end-3">
          {t("satelliteHint")}
        </p>
      )}

      {drawing && selected && (
        <DrawingBar
          points={drawing}
          onUndo={() => setDrawing((pts) => (pts ? pts.slice(0, -1) : pts))}
          onCancel={() => setDrawing(null)}
          field={selected}
          farmId={farmId}
          onSaved={() => setDrawing(null)}
        />
      )}

      {selected && !drawing && (
        <FieldPanel field={selected} mode={mode} onClose={() => setSelectedId(null)} onDraw={() => setDrawing([])} />
      )}
    </>
  );
}

function FieldPanel({
  field,
  mode,
  onClose,
  onDraw,
}: {
  field: ParcelField;
  mode: "overview" | "manage";
  onClose: () => void;
  onDraw: () => void;
}) {
  const t = useTranslations("farmMap");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const locale = useLocale();
  const drawnArea = field.boundaryEstimated ? null : polygonAreaHectares(field.polygon);

  return (
    <MapPanel
      title={field.name}
      subtitle={`${tCommon(`crop.${field.cropType}`)} · ${tCommon(`fieldStatus.${field.status}`)}`}
      onClose={onClose}
    >
      <dl>
        <MapPanelRow label={t("enteredArea")} value={`${format.number(field.areaHectares)} ${tCommon("unitHectare")}`} />
        {drawnArea !== null && (
          <MapPanelRow label={t("drawnArea")} value={`${format.number(drawnArea, { maximumFractionDigits: 1 })} ${tCommon("unitHectare")}`} />
        )}
        <MapPanelRow label={t("boundary")} value={field.boundaryEstimated ? t("boundaryEstimated") : t("boundaryDrawn")} />
        {field.plantedAt && <MapPanelRow label={t("planted")} value={formatDayLabel(field.plantedAt, locale)} />}
        {field.expectedHarvestAt && <MapPanelRow label={t("expectedHarvest")} value={formatDayLabel(field.expectedHarvestAt, locale)} />}
      </dl>
      <div className="mt-4 flex flex-col gap-2">
        {mode === "manage" && (
          <Button variant={field.boundaryEstimated ? "default" : "outline"} onClick={onDraw}>
            <PenLine aria-hidden="true" />
            {field.boundaryEstimated ? t("drawBoundary") : t("redrawBoundary")}
          </Button>
        )}
        {mode === "overview" && field.farmId && (
          <Link href={`/farms/${field.farmId}`} className={buttonVariants({ variant: "outline" })}>
            {t("openFarm")}
          </Link>
        )}
      </div>
    </MapPanel>
  );
}

function DrawingBar({
  points,
  field,
  farmId,
  onUndo,
  onCancel,
  onSaved,
}: {
  points: LatLng[];
  field: ParcelField;
  farmId?: string;
  onUndo: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("farmMap");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ring = points.length >= 3 ? [...points, points[0]] : null;
  const area = ring ? polygonAreaHectares(ring) : null;

  async function save() {
    if (!ring) return;
    setSaving(true);
    setError(null);
    try {
      await updateField(field.id, { polygon: ring });
      await Promise.all([
        farmId ? queryClient.invalidateQueries({ queryKey: ["farms", "detail", farmId] }) : null,
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
      ]);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    // At the bottom on phones (thumb reach, and the field being drawn stays
    // visible above it); top-leading corner on wider screens.
    <div className="absolute inset-x-3 bottom-8 z-[8] rounded-xl border border-border bg-card p-3 shadow-lg sm:inset-x-auto sm:start-3 sm:top-3 sm:bottom-auto sm:w-96">
      <p className="text-sm font-semibold text-foreground">{field.name}</p>
      <p aria-live="polite" className="mt-0.5 text-sm text-muted-foreground">
        {t("drawingHint", { count: points.length })}
        {area !== null && ` ${t("drawnArea")}: ${format.number(area, { maximumFractionDigits: 1 })} ${tCommon("unitHectare")}`}
      </p>
      <FormError className="mt-2">{error}</FormError>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={!ring || saving} onClick={save}>
          <Check aria-hidden="true" />
          {saving ? tCommon("saving") : t("saveBoundary")}
        </Button>
        <Button size="sm" variant="outline" disabled={points.length === 0 || saving} onClick={onUndo}>
          <Undo2 aria-hidden="true" />
          {t("undoPoint")}
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={onCancel}>
          <X aria-hidden="true" />
          {t("cancelDrawing")}
        </Button>
      </div>
    </div>
  );
}
