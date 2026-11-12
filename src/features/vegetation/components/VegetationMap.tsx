"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Satellite } from "lucide-react";
import { BaseMap } from "@/components/maps/BaseMap";
import { MapLegend } from "@/components/maps/MapLegend";
import { MapSearch } from "@/components/maps/MapSearch";
import { FarmMarkersLayer, initialViewForFarms } from "@/components/maps/FarmMarkersLayer";
import { useGeoJsonLayer, useRasterLayer } from "@/components/maps/hooks";
import { MAP_COLORS, latLngRingToGeoJson } from "@/components/maps/map-theme";
import {
  daysAgo,
  GIBS_ATTRIBUTION,
  hlsTrueColorTiles,
  HLS_MAX_ZOOM,
  modisNdviTiles,
  NDVI_LEGEND_STOPS,
  NDVI_MAX_ZOOM,
  recentNdviPeriods,
  samePeriodLastYear,
} from "@/components/maps/gibs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/utils/cn";
import type { DashboardField } from "@/types/dashboard";
import type { FarmListItem } from "@/types/farm";

export function VegetationMap({ farms, fields }: { farms: FarmListItem[]; fields: DashboardField[] }) {
  const t = useTranslations("vegetationMap");
  const format = useFormatter();
  // NDVI pixels are 250 m: zoom in only as far as is still meaningful.
  const [initialView] = useState(() => initialViewForFarms(farms, 0.08));
  const periods = useMemo(() => recentNdviPeriods(46), []);
  const [period, setPeriod] = useState(periods[0]);
  const [showLastYear, setShowLastYear] = useState(false);
  const [opacity, setOpacity] = useState(0.8);
  const [trueColor, setTrueColor] = useState(false);
  const [imageDate, setImageDate] = useState(() => daysAgo(4));

  const shown = showLastYear ? samePeriodLastYear(period) : period;
  const label = (iso: string) => format.dateTime(new Date(`${iso}T00:00:00Z`), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          <span id="ndvi-period-label">{t("period")}</span>
          <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
            <SelectTrigger aria-labelledby="ndvi-period-label" className="w-full sm:w-56">
              <SelectValue>{(v: string) => label(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {label(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-foreground">{t("showing")}</legend>
          <div className="flex rounded-lg border border-border bg-card p-1">
            {[false, true].map((ly) => (
              <button
                key={String(ly)}
                type="button"
                aria-pressed={showLastYear === ly}
                onClick={() => setShowLastYear(ly)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-medium transition-colors pointer-coarse:h-10",
                  showLastYear === ly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ly ? `${t("sameTimeLastYear")} (${label(samePeriodLastYear(period))})` : label(period)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex min-w-48 flex-col gap-1.5 text-sm font-medium sm:w-56">
          {t("opacity")}
          <Slider aria-label={t("opacity")} min={0.2} max={1} step={0.05} value={opacity} onValueChange={(v) => setOpacity(v)} />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={trueColor}
            onClick={() => setTrueColor((v) => !v)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
              trueColor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            <Satellite className="size-4" aria-hidden="true" />
            Sentinel-2
          </button>
          {trueColor && (
            <input
              type="date"
              aria-label={t("period")}
              value={imageDate}
              min="2015-12-01"
              max={daysAgo(1)}
              onChange={(e) => e.target.value && setImageDate(e.target.value)}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-[60dvh] min-h-[26rem] sm:h-[34rem]">
          <BaseMap initialView={initialView} ariaLabel={t("ariaLabel")}>
            <MapSearch />
            <VegetationLayers
              ndviTiles={modisNdviTiles(shown)}
              opacity={opacity}
              trueColorTiles={trueColor ? hlsTrueColorTiles(imageDate) : null}
              fields={fields}
            />
            <FarmMarkersLayer farms={farms} />
            <MapLegend
              title={t("legendTitle")}
              items={[
                { label: t("legendScale"), swatch: { kind: "gradient", stops: NDVI_LEGEND_STOPS, min: "0", max: "0.9" } },
                { label: t("yourFields"), swatch: { kind: "line", color: MAP_COLORS.ink, width: 2 } },
              ]}
              footer={`${t("showing")}: ${label(shown)}`}
            />
          </BaseMap>
        </div>

        <aside className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
          <h2 className="type-headline text-foreground">{t("whatIsTitle")}</h2>
          <p className="text-foreground">{t("whatIs")}</p>
          <p className="text-foreground">{t("whatIsNot")}</p>
          <p className="text-muted-foreground">{t("resolution")}</p>
          {fields.length === 0 && <p className="text-muted-foreground">{t("noFieldsHint")}</p>}
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">{t("source")}</p>
        </aside>
      </div>
    </div>
  );
}

function VegetationLayers({
  ndviTiles,
  opacity,
  trueColorTiles,
  fields,
}: {
  ndviTiles: string;
  opacity: number;
  trueColorTiles: string | null;
  fields: DashboardField[];
}) {
  useRasterLayer({ id: "hls-context", tiles: trueColorTiles, maxzoom: HLS_MAX_ZOOM, attribution: GIBS_ATTRIBUTION });
  useRasterLayer({ id: "ndvi", tiles: ndviTiles, maxzoom: NDVI_MAX_ZOOM, attribution: GIBS_ATTRIBUTION, opacity });

  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: fields
        .filter((f) => f.polygon.length >= 4)
        .map((f) => ({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [latLngRingToGeoJson(f.polygon)] },
          properties: { fid: f.id, name: f.name },
        })),
    }),
    [fields]
  );
  // Outlines only, so the NDVI colour underneath stays readable.
  useGeoJsonLayer({
    id: "veg-fields",
    data,
    layers: [
      { id: "veg-fields-halo", type: "line", paint: { "line-color": "#ffffff", "line-width": 4, "line-opacity": 0.9 } },
      { id: "veg-fields-line", type: "line", paint: { "line-color": MAP_COLORS.ink, "line-width": 2 } },
      {
        id: "veg-fields-label",
        type: "symbol",
        minzoom: 12,
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 12 },
        paint: { "text-color": MAP_COLORS.ink, "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      },
    ],
  });
  return null;
}
