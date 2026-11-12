"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { Info, X } from "lucide-react";
import type { MapMouseEvent } from "maplibre-gl";
import { BaseMap, useMapContext } from "@/components/maps/BaseMap";
import { MapSearch } from "@/components/maps/MapSearch";
import { MapStatus } from "@/components/maps/MapStatus";
import { FarmMarkersLayer, initialViewForFarms } from "@/components/maps/FarmMarkersLayer";
import { useGeoJsonLayer } from "@/components/maps/hooks";
import { MAP_COLORS } from "@/components/maps/map-theme";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/states/ErrorState";
import { apiRequest } from "@/services/api-client";
import { ClimateCharts, ClimateTable, type PlaceSeries } from "@/features/climate/components/ClimateCharts";
import type { ClimateMode, ClimateSeries } from "@/types/geodata";
import type { FarmListItem } from "@/types/farm";

const LABELS = ["A", "B", "C"] as const;
const PLACE_COLORS = [MAP_COLORS.olive, MAP_COLORS.blue, MAP_COLORS.terracotta];

interface Place {
  label: (typeof LABELS)[number];
  lat: number;
  lng: number;
  name?: string;
}

function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export function ClimateMap({ farms }: { farms: FarmListItem[] }) {
  const t = useTranslations("climateMap");
  const [initialView] = useState(() => initialViewForFarms(farms, 1.2));
  const [places, setPlaces] = useState<Place[]>(() =>
    farms[0] ? [{ label: "A", lat: farms[0].latitude, lng: farms[0].longitude, name: farms[0].name }] : []
  );
  const [mode, setMode] = useState<ClimateMode>("daily");
  // NASA POWER's daily data trails real time by a few days.
  const [start, setStart] = useState(() => isoDaysAgo(97));
  const [end, setEnd] = useState(() => isoDaysAgo(7));
  const lastYear = new Date().getUTCFullYear() - 1;
  const [fromYear, setFromYear] = useState(String(lastYear - 9));
  const [toYear, setToYear] = useState(String(lastYear));
  const [notice, setNotice] = useState<string | null>(null);

  const addPlace = useCallback(
    (lat: number, lng: number) => {
      setPlaces((prev) => {
        if (prev.length >= LABELS.length) {
          setNotice(t("maxReached"));
          return prev;
        }
        setNotice(null);
        const label = LABELS.find((l) => !prev.some((p) => p.label === l))!;
        return [...prev, { label, lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 }].sort((a, b) => a.label.localeCompare(b.label));
      });
    },
    [t]
  );

  const params =
    mode === "daily" ? `mode=daily&start=${start}&end=${end}` : mode === "monthly" ? `mode=monthly&start=${fromYear}&end=${toYear}` : "mode=climatology";
  const results = useQueries({
    queries: places.map((p) => ({
      queryKey: ["climate", p.lat, p.lng, params],
      queryFn: () => apiRequest<ClimateSeries>(`/api/climate?lat=${p.lat}&lng=${p.lng}&${params}`),
      staleTime: 24 * 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const loaded: PlaceSeries[] = places.flatMap((p, i) =>
    results[i]?.data ? [{ label: p.label, color: PLACE_COLORS[LABELS.indexOf(p.label)], series: results[i].data! }] : []
  );
  const anyLoading = results.some((r) => r.isFetching);
  const firstError = results.find((r) => r.isError)?.error;

  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        {t("notForecast")}
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-[50dvh] min-h-[22rem] sm:h-[26rem]">
          <BaseMap initialView={initialView} ariaLabel={t("ariaLabel")} showGeolocate>
            <MapSearch />
            <FarmMarkersLayer farms={farms} />
            <PlacesLayer places={places} onAdd={addPlace} />
            <MapStatus state={anyLoading ? "loading" : "idle"} message={t("loading")} />
          </BaseMap>
        </div>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="climate-places">
            <h2 id="climate-places" className="type-headline text-foreground">
              {t("locations")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("addHint")}</p>
            {notice && (
              <p role="status" className="mt-2 text-sm text-warning">
                {notice}
              </p>
            )}
            <ul className="mt-3 flex flex-col gap-2">
              {places.map((p) => (
                <li key={p.label} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: PLACE_COLORS[LABELS.indexOf(p.label)] }}
                    aria-hidden="true"
                  >
                    {p.label}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium text-foreground">{p.name ?? t("place", { label: p.label })}</span>
                    <span className="tabular block text-muted-foreground" dir="ltr">
                      {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPlaces((prev) => prev.filter((x) => x.label !== p.label))}
                    aria-label={t("removePlace", { label: p.label })}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <Tabs value={mode} onValueChange={(v) => setMode(v as ClimateMode)}>
              <TabsList aria-label={t("mode")} className="w-full">
                <TabsTrigger value="daily">{t("modeDaily")}</TabsTrigger>
                <TabsTrigger value="monthly">{t("modeMonthly")}</TabsTrigger>
                <TabsTrigger value="climatology">{t("modeClimatology")}</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "daily" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("from")}
                  <Input type="date" value={start} min="1981-01-01" max={end} onChange={(e) => e.target.value && setStart(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("to")}
                  <Input type="date" value={end} min={start} max={isoDaysAgo(3)} onChange={(e) => e.target.value && setEnd(e.target.value)} />
                </label>
              </div>
            )}
            {mode === "monthly" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("fromYear")}
                  <Input type="number" inputMode="numeric" value={fromYear} min={1981} max={toYear} onChange={(e) => setFromYear(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("toYear")}
                  <Input type="number" inputMode="numeric" value={toYear} min={fromYear} max={lastYear} onChange={(e) => setToYear(e.target.value)} />
                </label>
              </div>
            )}
          </section>
        </div>
      </div>

      {places.length === 0 && <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">{t("noPlaces")}</p>}
      {firstError && <ErrorState title={t("unavailable")} description={firstError.message} onRetry={() => results.forEach((r) => r.isError && r.refetch())} />}
      {places.length > 0 && loaded.length === 0 && anyLoading && <Skeleton className="h-64 rounded-xl" aria-busy="true" />}

      {loaded.length > 0 && (
        <>
          <ClimateSummary places={loaded} mode={mode} />
          <ClimateCharts places={loaded} />
          <p className="text-sm text-muted-foreground">{t("missingValues")}</p>
          <ClimateTable places={loaded} />
          <SourceLine series={loaded[0].series} />
        </>
      )}
      <p className="text-sm text-muted-foreground">{t("whyNoHeatmap")}</p>
    </div>
  );
}

function mean(values: (number | null | undefined)[]) {
  const v = values.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

function ClimateSummary({ places, mode }: { places: PlaceSeries[]; mode: ClimateMode }) {
  const t = useTranslations("climateMap");
  const format = useFormatter();
  const f = (v: number | null, digits = 1) => (v === null ? "—" : format.number(v, { maximumFractionDigits: digits }));
  return (
    <section aria-labelledby="climate-summary">
      <h2 id="climate-summary" className="type-headline mb-3 text-foreground">
        {t("summary")}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {places.map((p) => {
          const rows = p.series.rows;
          const temp = mean(rows.map((r) => r.T2M));
          const precipValues = rows.map((r) => r.PRECTOTCORR);
          // Only a daily series can be summed into a total; monthly and
          // long-term values are already averages per day.
          const precip = mode === "daily" ? precipValues.reduce<number>((s, x) => s + (x ?? 0), 0) : mean(precipValues);
          const solar = mean(rows.map((r) => r.ALLSKY_SFC_SW_DWN));
          return (
            <div key={p.label} className="rounded-xl border border-border bg-card p-4" style={{ borderTopColor: p.color, borderTopWidth: 3 }}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{t("place", { label: p.label })}</h3>
              <dl>
              <div className="ledger py-1 text-sm">
                <dt className="text-muted-foreground">{t("meanTemp")}</dt>
                <span aria-hidden="true" className="ledger-fill" />
                <dd className="tabular font-semibold" dir="ltr">{f(temp)} {p.series.units.T2M}</dd>
              </div>
              <div className="ledger py-1 text-sm">
                <dt className="text-muted-foreground">{mode === "daily" ? t("totalPrecip") : t("var.PRECTOTCORR")}</dt>
                <span aria-hidden="true" className="ledger-fill" />
                <dd className="tabular font-semibold" dir="ltr">
                  {f(precip, 0)} {mode === "daily" ? "mm" : p.series.units.PRECTOTCORR}
                </dd>
              </div>
              <div className="ledger py-1 text-sm">
                <dt className="text-muted-foreground">{t("meanSolar")}</dt>
                <span aria-hidden="true" className="ledger-fill" />
                <dd className="tabular font-semibold" dir="ltr">{f(solar)} {p.series.units.ALLSKY_SFC_SW_DWN}</dd>
              </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SourceLine({ series }: { series: ClimateSeries }) {
  const t = useTranslations("climateMap");
  const range = series.range
    ? t("rangeLine", {
        start: `${series.range.start.slice(0, 4)}-${series.range.start.slice(4, 6)}-${series.range.start.slice(6, 8)}`,
        end: `${series.range.end.slice(0, 4)}-${series.range.end.slice(4, 6)}-${series.range.end.slice(6, 8)}`,
      })
    : "";
  return <p className="text-sm text-muted-foreground">{t("sourceLine", { source: series.source, grid: series.gridResolution, range })}</p>;
}

function PlacesLayer({ places, onAdd }: { places: Place[]; onAdd: (lat: number, lng: number) => void }) {
  const ctx = useMapContext();
  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: places.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { fid: p.label, label: p.label, color: PLACE_COLORS[LABELS.indexOf(p.label)] },
      })),
    }),
    [places]
  );

  useGeoJsonLayer({
    id: "climate-places",
    data,
    layers: [
      {
        id: "climate-places-dot",
        type: "circle",
        paint: { "circle-radius": 13, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 },
      },
      {
        id: "climate-places-label",
        type: "symbol",
        layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true },
        paint: { "text-color": "#ffffff" },
      },
    ],
  });

  useEffect(() => {
    if (!ctx) return;
    const click = (e: MapMouseEvent) => onAdd(e.lngLat.lat, e.lngLat.lng);
    ctx.map.on("click", click);
    ctx.map.getCanvas().style.cursor = "crosshair";
    return () => {
      ctx.map.off("click", click);
      ctx.map.getCanvas().style.cursor = "";
    };
  }, [ctx, onAdd]);

  return null;
}
