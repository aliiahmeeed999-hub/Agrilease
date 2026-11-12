"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Info } from "lucide-react";
import { BaseMap, useMapContext } from "@/components/maps/BaseMap";
import { MapPanel, MapPanelRow } from "@/components/maps/MapPanel";
import { MapLegend, type LegendItem } from "@/components/maps/MapLegend";
import { MapStatus } from "@/components/maps/MapStatus";
import { MapSearch } from "@/components/maps/MapSearch";
import { FarmMarkersLayer, initialViewForFarms } from "@/components/maps/FarmMarkersLayer";
import { useGeoJsonLayer, useMapViewport } from "@/components/maps/hooks";
import { useOsmFeatures } from "@/components/maps/useOsmFeatures";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { WATER_RESOURCE_TYPES, type OsmFeature, type WaterResourceType } from "@/types/geodata";
import type { FarmListItem } from "@/types/farm";

// One colour family (blues) for water, with type told apart by shape:
// areas, lines of different weight and dash, and points.
const WATER_STYLE: Record<WaterResourceType, { color: string; swatch: LegendItem["swatch"] }> = {
  RESERVOIR: { color: "#3f7fb0", swatch: { kind: "fill", color: "#3f7fb0" } },
  DAM: { color: "#1d3c5a", swatch: { kind: "line", color: "#1d3c5a", width: 4 } },
  RIVER: { color: "#2f78b7", swatch: { kind: "line", color: "#2f78b7", width: 3 } },
  CANAL: { color: "#1764a0", swatch: { kind: "line", color: "#1764a0", width: 2, dashed: true } },
  IRRIGATION: { color: "#1f8a7a", swatch: { kind: "line", color: "#1f8a7a", width: 2, dashed: true } },
  WELL: { color: "#0f4c75", swatch: { kind: "point", color: "#0f4c75" } },
  WATER_POINT: { color: "#4aa3d8", swatch: { kind: "point", color: "#4aa3d8" } },
};

export function WaterMap({ farms }: { farms: FarmListItem[] }) {
  const t = useTranslations("waterMap");
  const tMaps = useTranslations("maps");
  // Water data is dense and loads from zoom 10: open at town level on the
  // first farm so something shows straight away.
  const [initialView] = useState(() =>
    farms[0] ? { center: [farms[0].longitude, farms[0].latitude] as [number, number], zoom: 11 } : initialViewForFarms(farms)
  );
  const [types, setTypes] = useState<Set<WaterResourceType>>(() => new Set(WATER_RESOURCE_TYPES));
  const [selected, setSelected] = useState<OsmFeature | null>(null);
  const [inView, setInView] = useState<OsmFeature[]>([]);

  function toggle(type: WaterResourceType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">{t("types")}</legend>
        {WATER_RESOURCE_TYPES.map((type) => {
          const on = types.has(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(type)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
                on ? "border-foreground/30 bg-card text-foreground" : "border-border text-muted-foreground line-through decoration-1"
              )}
            >
              <span aria-hidden="true" className="size-3 rounded-sm" style={{ background: on ? WATER_STYLE[type].color : "transparent", border: `2px solid ${WATER_STYLE[type].color}` }} />
              {t(`type.${type}`)}
            </button>
          );
        })}
      </fieldset>

      <div className="h-[60dvh] min-h-[26rem] sm:h-[34rem]">
        <BaseMap initialView={initialView} ariaLabel={t("ariaLabel")} showGeolocate>
          <MapSearch />
          <WaterLayers types={types} selectedId={selected?.id ?? null} onSelect={setSelected} onInView={setInView} />
          <FarmMarkersLayer farms={farms} />
          {selected && <WaterPanel feature={selected} onClose={() => setSelected(null)} />}
        </BaseMap>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("noLevels")}
        </p>
        <p>{tMaps("osmAttribution")}</p>
      </div>

      <WaterList features={inView} onSelect={setSelected} selectedId={selected?.id ?? null} />
    </div>
  );
}

function WaterLayers({
  types,
  selectedId,
  onSelect,
  onInView,
}: {
  types: Set<WaterResourceType>;
  selectedId: string | null;
  onSelect: (f: OsmFeature | null) => void;
  onInView: (features: OsmFeature[]) => void;
}) {
  const t = useTranslations("waterMap");
  const tMaps = useTranslations("maps");
  const ctx = useMapContext();
  const viewport = useMapViewport();
  const osm = useOsmFeatures("water", viewport);

  const features = useMemo(
    () => (osm.tooFar ? [] : (osm.data?.features ?? []).filter((f) => types.has(f.properties.kind as WaterResourceType))),
    [osm.data, osm.tooFar, types]
  );
  const byId = useMemo(() => new Map(features.map((f) => [f.id, f])), [features]);

  // Report what is loaded for the list below the map (outside the map, so
  // the information is available without using the map).
  useEffect(() => {
    onInView(features);
  }, [features, onInView]);

  // Choosing an item in the list brings it into view.
  useEffect(() => {
    if (!ctx || !selectedId) return;
    const f = byId.get(selectedId);
    if (!f) return;
    const g = f.geometry;
    const first =
      g.type === "Point" ? g.coordinates : g.type === "LineString" ? g.coordinates[0] : g.type === "Polygon" ? g.coordinates[0][0] : g.coordinates[0][0][0];
    if (!ctx.map.getBounds().contains(first as [number, number])) ctx.map.easeTo({ center: first as [number, number] });
  }, [ctx, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: features.map((f) => ({
        type: "Feature",
        geometry: f.geometry as GeoJSON.Geometry,
        properties: { fid: f.id, kind: f.properties.kind, color: WATER_STYLE[f.properties.kind as WaterResourceType].color },
      })),
    }),
    [features]
  );

  const selectedWidth = (normal: number) => ["case", ["boolean", ["feature-state", "selected"], false], normal + 3, normal] as unknown as number;

  useGeoJsonLayer({
    id: "water",
    data,
    selectedId,
    interactiveLayers: ["water-area", "water-line", "water-point"],
    onSelect: (props) => onSelect(props?.fid ? (byId.get(props.fid as string) ?? null) : null),
    layers: [
      {
        id: "water-area",
        type: "fill",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.75, 0.5] },
      },
      {
        id: "water-area-outline",
        type: "line",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "line-color": ["get", "color"], "line-width": selectedWidth(1) },
      },
      {
        id: "water-line",
        type: "line",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["match", ["get", "kind"], "RIVER", 3, "DAM", 4, 2] as unknown as number,
          "line-dasharray": ["match", ["get", "kind"], ["CANAL", "IRRIGATION"], ["literal", [2, 1.5]], ["literal", [1, 0]]] as unknown as number[],
        },
      },
      {
        id: "water-line-selected",
        type: "line",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#b34f2a", "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 5, 0] as unknown as number, "line-opacity": 0.8 },
      },
      {
        id: "water-point",
        type: "circle",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 8, 5.5] as unknown as number,
          "circle-stroke-color": ["case", ["boolean", ["feature-state", "selected"], false], "#b34f2a", "#ffffff"] as unknown as string,
          "circle-stroke-width": 2,
        },
      },
    ],
  });

  const status = osm.tooFar
    ? { state: "zoomIn" as const, message: t("zoomForWater") }
    : osm.isFetching
      ? { state: "loading" as const }
      : osm.isError
        ? { state: "error" as const, message: tMaps("osmUnavailable") }
        : { state: "idle" as const };

  return (
    <>
      <MapStatus state={status.state} message={status.message} onRetry={() => osm.refetch()} />
      <MapLegend
        title={tMaps("legend")}
        defaultOpen={false}
        items={[...WATER_RESOURCE_TYPES.filter((ty) => types.has(ty)).map((ty) => ({ label: t(`type.${ty}`), swatch: WATER_STYLE[ty].swatch })), { label: tMaps("myFarms"), swatch: { kind: "point" as const, color: "#281c13" } }]}
      />
    </>
  );
}

function WaterPanel({ feature, onClose }: { feature: OsmFeature; onClose: () => void }) {
  const t = useTranslations("waterMap");
  const tMaps = useTranslations("maps");
  const tags = feature.properties.tags;
  const kind = feature.properties.kind as WaterResourceType;
  return (
    <MapPanel title={feature.properties.name ?? t("unnamed")} subtitle={t(`type.${kind}`)} onClose={onClose}>
      <dl>
        <MapPanelRow label={t("typeLabel")} value={t(`type.${kind}`)} />
        {tags.operator && <MapPanelRow label={t("operator")} value={tags.operator} />}
        {tags.capacity && <MapPanelRow label={t("capacity")} value={tags.capacity} dir="ltr" />}
      </dl>
      {tags.intermittent === "yes" && <p className="mt-3 text-sm text-foreground">{t("intermittent")}</p>}
      {tags.drinking_water === "yes" && <p className="mt-3 text-sm text-foreground">{t("drinkable")}</p>}
      <p className="mt-3 text-xs leading-snug text-muted-foreground">{t("noLevels")}</p>
      <a
        href={`https://www.openstreetmap.org/${feature.properties.osmId}`}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
      >
        {tMaps("viewOnOsm")}
        <ExternalLink aria-hidden="true" />
      </a>
    </MapPanel>
  );
}

function WaterList({ features, onSelect, selectedId }: { features: OsmFeature[]; onSelect: (f: OsmFeature) => void; selectedId: string | null }) {
  const t = useTranslations("waterMap");
  const tMaps = useTranslations("maps");
  const counts = useMemo(() => {
    const c = new Map<WaterResourceType, number>();
    for (const f of features) c.set(f.properties.kind as WaterResourceType, (c.get(f.properties.kind as WaterResourceType) ?? 0) + 1);
    return c;
  }, [features]);
  const named = features.filter((f) => f.properties.name).slice(0, 40);

  return (
    <section aria-labelledby="water-list">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="water-list" className="type-headline text-foreground">
          {t("listTitle")}
        </h2>
        <span className="text-sm text-muted-foreground">{tMaps("inThisArea", { count: features.length })}</span>
      </div>
      {counts.size > 0 && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-foreground">
          {[...counts.entries()].map(([type, n]) => (
            <li key={type} className="tabular">
              {t(`type.${type}`)}: <span className="font-semibold">{n}</span>
            </li>
          ))}
        </ul>
      )}
      {named.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {named.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onSelect(f)}
                aria-current={f.id === selectedId ? "true" : undefined}
                className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-muted/60", f.id === selectedId && "bg-muted")}
              >
                <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ background: WATER_STYLE[f.properties.kind as WaterResourceType].color }} />
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{f.properties.name}</span>
                <span className="shrink-0 text-muted-foreground">{t(`type.${f.properties.kind}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
