"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { ExternalLink, Navigation, Search, Store, Tractor } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BaseMap, useMapContext } from "@/components/maps/BaseMap";
import { MapPanel, MapPanelRow } from "@/components/maps/MapPanel";
import { MapLegend } from "@/components/maps/MapLegend";
import { MapStatus } from "@/components/maps/MapStatus";
import { MapSearch } from "@/components/maps/MapSearch";
import { FarmMarkersLayer, initialViewForFarms } from "@/components/maps/FarmMarkersLayer";
import { useGeoJsonLayer, useMapViewport, type Viewport } from "@/components/maps/hooks";
import { useOsmFeatures } from "@/components/maps/useOsmFeatures";
import { MAP_COLORS } from "@/components/maps/map-theme";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/services/api-client";
import { haversineKm } from "@/lib/geo";
import { cn } from "@/utils/cn";
import { SUPPLIER_CATEGORIES, type ListingLocation, type OsmFeature, type SupplierCategory } from "@/types/geodata";
import type { FarmListItem } from "@/types/farm";

type Item =
  | { kind: "listing"; id: string; name: string; lng: number; lat: number; categories: SupplierCategory[]; listing: ListingLocation }
  | { kind: "shop"; id: string; name: string | null; lng: number; lat: number; categories: SupplierCategory[]; feature: OsmFeature };

// Platform equipment categories mapped onto the material filter.
function listingCategories(category: string): SupplierCategory[] {
  return category === "IRRIGATION" ? ["IRRIGATION", "EQUIPMENT"] : ["EQUIPMENT"];
}

function inViewport(item: { lng: number; lat: number }, v: Viewport | null) {
  return !!v && item.lat >= v.south && item.lat <= v.north && item.lng >= v.west && item.lng <= v.east;
}

export function SuppliersMap({ farms }: { farms: FarmListItem[] }) {
  const t = useTranslations("suppliersMap");
  const tMaps = useTranslations("maps");
  const [initialView] = useState(() => initialViewForFarms(farms, 0.4));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [category, setCategory] = useState<SupplierCategory | "ALL">("ALL");
  const [showListings, setShowListings] = useState(true);
  const [showShops, setShowShops] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visible, setVisible] = useState<Item[]>([]);

  const listingsQuery = useQuery({
    queryKey: ["marketplace", "locations"],
    queryFn: () => apiRequest<{ locations: ListingLocation[]; unplacedCount: number }>("/api/marketplace/equipment/locations"),
    staleTime: 5 * 60 * 1000,
  });

  // Memoised: a new object each render would recompute the item list and
  // loop through the parent's state update.
  const filters = useMemo(() => ({ query: deferredQuery, category, showListings, showShops }), [deferredQuery, category, showListings, showShops]);
  const selected = visible.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters sit above the map, not on it: easier to reach on a phone and
          readable without interacting with the map at all. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium sm:max-w-sm">
          {t("searchLabel")}
          <span className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="ps-9" type="search" />
          </span>
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          <span id="supplier-category-label">{t("categoryLabel")}</span>
          <Select value={category} onValueChange={(v) => setCategory((v as SupplierCategory | "ALL") ?? "ALL")}>
            <SelectTrigger aria-labelledby="supplier-category-label" className="w-full sm:w-56">
              <SelectValue>{(v: string) => (v === "ALL" ? t("allCategories") : t(`category.${v}`))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allCategories")}</SelectItem>
              {SUPPLIER_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`category.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{tMaps("allLayers")}</legend>
          <LayerChip on={showListings} onToggle={() => setShowListings((v) => !v)} color={MAP_COLORS.olive} icon={Tractor} label={t("layerListings")} />
          <LayerChip on={showShops} onToggle={() => setShowShops((v) => !v)} color={MAP_COLORS.terracotta} icon={Store} label={t("layerShops")} />
        </fieldset>
      </div>

      <div className="h-[60dvh] min-h-[26rem] sm:h-[34rem]">
        <BaseMap initialView={initialView} ariaLabel={t("ariaLabel")} showGeolocate>
          <MapSearch />
          <FarmMarkersLayer farms={farms} />
          <SupplierLayers
            listings={listingsQuery.data?.locations ?? []}
            filters={filters}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onVisibleChange={setVisible}
          />
          {selected && <SupplierPanel item={selected} farms={farms} onClose={() => setSelectedId(null)} />}
        </BaseMap>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>{t("approximateNote")}</p>
        {!!listingsQuery.data?.unplacedCount && <p>{t("unplaced", { count: listingsQuery.data.unplacedCount })}</p>}
        <p>{tMaps("osmAttribution")}</p>
      </div>

      <ResultsList items={visible} farms={farms} selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  );
}

function LayerChip({
  on,
  onToggle,
  color,
  icon: Icon,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  color: string;
  icon: typeof Store;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
        on ? "border-foreground/30 bg-card text-foreground" : "border-border bg-transparent text-muted-foreground line-through decoration-1"
      )}
    >
      <span className="size-3 rounded-full" style={{ background: on ? color : "transparent", border: `2px solid ${color}` }} aria-hidden="true" />
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function SupplierLayers({
  listings,
  filters,
  selectedId,
  onSelect,
  onVisibleChange,
}: {
  listings: ListingLocation[];
  filters: { query: string; category: SupplierCategory | "ALL"; showListings: boolean; showShops: boolean };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onVisibleChange: (items: Item[]) => void;
}) {
  const t = useTranslations("suppliersMap");
  const tMaps = useTranslations("maps");
  const tCategory = useTranslations("common.equipmentCategory");
  const ctx = useMapContext();
  const viewport = useMapViewport();
  const osm = useOsmFeatures("suppliers", viewport);

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [];
    if (filters.showListings) {
      for (const l of listings) {
        all.push({ kind: "listing", id: `listing:${l.id}`, name: l.name, lng: l.lng, lat: l.lat, categories: listingCategories(l.category), listing: l });
      }
    }
    if (filters.showShops && osm.data && !osm.tooFar) {
      for (const f of osm.data.features) {
        if (f.geometry.type !== "Point") continue;
        const [lng, lat] = f.geometry.coordinates;
        all.push({ kind: "shop", id: f.id, name: f.properties.name, lng, lat, categories: f.properties.categories ?? ["OTHER"], feature: f });
      }
    }
    return all.filter((item) => {
      if (filters.category !== "ALL" && !item.categories.includes(filters.category)) return false;
      if (!filters.query) return true;
      const haystack = [
        item.name ?? "",
        ...item.categories.map((c) => t(`category.${c}`)),
        item.kind === "listing" ? tCategory(item.listing.category) : (item.feature.properties.tags.agrarian ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(filters.query);
    });
  }, [listings, osm.data, osm.tooFar, filters, t, tCategory]);

  useEffect(() => {
    onVisibleChange(items.filter((i) => inViewport(i, viewport)));
  }, [items, viewport, onVisibleChange]);

  const toCollection = (kind: Item["kind"]): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: items
      .filter((i) => i.kind === kind)
      .map((i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [i.lng, i.lat] }, properties: { fid: i.id } })),
  });
  const listingData = useMemo(() => toCollection("listing"), [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const shopData = useMemo(() => toCollection("shop"), [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const pointLayers = (prefix: string, color: string) => [
    {
      id: `${prefix}-clusters`,
      type: "circle" as const,
      filter: ["has", "point_count"] as ["has", string],
      paint: {
        "circle-color": color,
        "circle-opacity": 0.9,
        "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 23] as unknown as number,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    },
    {
      id: `${prefix}-count`,
      type: "symbol" as const,
      filter: ["has", "point_count"] as ["has", string],
      layout: { "text-field": ["get", "point_count_abbreviated"] as unknown as string, "text-font": ["Noto Sans Bold"], "text-size": 12 },
      paint: { "text-color": "#ffffff" },
    },
    {
      id: `${prefix}-point`,
      type: "circle" as const,
      filter: ["!", ["has", "point_count"]] as unknown as ["has", string],
      paint: {
        "circle-color": color,
        "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 9, 6.5] as unknown as number,
        "circle-stroke-color": ["case", ["boolean", ["feature-state", "selected"], false], MAP_COLORS.ink, "#ffffff"] as unknown as string,
        "circle-stroke-width": 2.5,
      },
    },
  ];

  useGeoJsonLayer({
    id: "listings",
    data: listingData,
    cluster: { clusterLayerId: "listings-clusters" },
    interactiveLayers: ["listings-clusters", "listings-point"],
    selectedId,
    onSelect: (props) => onSelect((props?.fid as string) ?? null),
    layers: pointLayers("listings", MAP_COLORS.olive),
  });
  useGeoJsonLayer({
    id: "shops",
    data: shopData,
    cluster: { clusterLayerId: "shops-clusters" },
    interactiveLayers: ["shops-clusters", "shops-point"],
    selectedId,
    onSelect: (props) => onSelect((props?.fid as string) ?? null),
    layers: pointLayers("shops", MAP_COLORS.terracotta),
  });

  // Selecting from the list below brings the item into view.
  useEffect(() => {
    if (!ctx || !selectedId) return;
    const item = items.find((i) => i.id === selectedId);
    if (item && !inViewport(item, viewport)) ctx.map.easeTo({ center: [item.lng, item.lat], zoom: Math.max(ctx.map.getZoom(), 12) });
  }, [ctx, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = !filters.showShops
    ? { state: "idle" as const }
    : osm.tooFar
      ? { state: "zoomIn" as const, message: t("zoomForShops") }
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
        items={[
          { label: t("layerListings"), swatch: { kind: "point", color: MAP_COLORS.olive } },
          { label: t("layerShops"), swatch: { kind: "point", color: MAP_COLORS.terracotta } },
          { label: tMaps("myFarms"), swatch: { kind: "point", color: MAP_COLORS.ink } },
        ]}
      />
    </>
  );
}

function nearestFarm(item: { lat: number; lng: number }, farms: FarmListItem[]) {
  let best: { farm: FarmListItem; km: number } | null = null;
  for (const farm of farms) {
    const km = haversineKm([farm.latitude, farm.longitude], [item.lat, item.lng]);
    if (!best || km < best.km) best = { farm, km };
  }
  return best;
}

function SupplierPanel({ item, farms, onClose }: { item: Item; farms: FarmListItem[]; onClose: () => void }) {
  const t = useTranslations("suppliersMap");
  const tMaps = useTranslations("maps");
  const tCategory = useTranslations("common.equipmentCategory");
  const format = useFormatter();
  const near = nearestFarm(item, farms);
  const distance = near ? tMaps("distanceFromFarm", { km: format.number(near.km, { maximumFractionDigits: near.km < 10 ? 1 : 0 }), farm: near.farm.name }) : null;
  // OpenStreetMap routing from the nearest farm (no account or key needed).
  const directions = near
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${near.farm.latitude},${near.farm.longitude};${item.lat},${item.lng}`
    : `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}#map=15/${item.lat}/${item.lng}`;

  if (item.kind === "listing") {
    const l = item.listing;
    return (
      <MapPanel title={l.name} subtitle={tCategory(l.category)} onClose={onClose}>
        <dl>
          {l.dailyRateMad !== null && <MapPanelRow label={t("availability")} value={t("perDay", { amount: format.number(l.dailyRateMad) })} />}
          {l.salePrice !== null && <MapPanelRow label={t("availability")} value={t("forSale", { amount: format.number(l.salePrice) })} />}
          {l.ownerRegion && <MapPanelRow label={t("address")} value={l.ownerRegion} />}
        </dl>
        {distance && <p className="mt-3 text-sm text-foreground">{distance}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{t("approximateNote")}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href={`/marketplace/${l.id}`} className={buttonVariants()}>
            {t("viewListing")}
          </Link>
        </div>
      </MapPanel>
    );
  }

  const tags = item.feature.properties.tags;
  const address = [tags["addr:street"] && `${tags["addr:housenumber"] ?? ""} ${tags["addr:street"]}`.trim(), tags["addr:city"] ?? tags["addr:place"]]
    .filter(Boolean)
    .join(", ");
  const phone = tags.phone ?? tags["contact:phone"];
  const website = tags.website ?? tags["contact:website"];
  return (
    <MapPanel title={item.name ?? t("unnamedShop")} subtitle={item.categories.map((c) => t(`category.${c}`)).join(" · ")} onClose={onClose}>
      <dl>
        <MapPanelRow label={t("sells")} value={item.categories.map((c) => t(`category.${c}`)).join(", ")} />
        {address && <MapPanelRow label={t("address")} value={address} />}
        {phone && (
          <MapPanelRow
            label={t("phone")}
            dir="ltr"
            value={
              <a href={`tel:${phone.split(";")[0]}`} className="underline-offset-4 hover:underline">
                {phone.split(";")[0]}
              </a>
            }
          />
        )}
        {tags.opening_hours && <MapPanelRow label={t("hours")} value={tags.opening_hours} dir="ltr" />}
      </dl>
      {/* Never invented: OpenStreetMap does not record stock. */}
      <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
        <span className="font-medium">{t("availability")}: </span>
        {t("stockUnknown")}
      </p>
      {distance && <p className="mt-3 text-sm text-foreground">{distance}</p>}
      <div className="mt-4 flex flex-col gap-2">
        <a href={directions} target="_blank" rel="noreferrer" className={buttonVariants()}>
          <Navigation aria-hidden="true" />
          {tMaps("directions")}
        </a>
        {website && (
          <a href={website} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            {t("website")}
            <ExternalLink aria-hidden="true" />
          </a>
        )}
        <a
          href={`https://www.openstreetmap.org/${item.feature.properties.osmId}`}
          target="_blank"
          rel="noreferrer"
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {tMaps("viewOnOsm")}
        </a>
      </div>
    </MapPanel>
  );
}

function ResultsList({
  items,
  farms,
  selectedId,
  onSelect,
}: {
  items: Item[];
  farms: FarmListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("suppliersMap");
  const tMaps = useTranslations("maps");
  const format = useFormatter();
  const sorted = useMemo(
    () =>
      items
        .map((i) => ({ item: i, near: nearestFarm(i, farms) }))
        .sort((a, b) => (a.near?.km ?? 0) - (b.near?.km ?? 0))
        .slice(0, 50),
    [items, farms]
  );

  return (
    <section aria-labelledby="supplier-results">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="supplier-results" className="type-headline text-foreground">
          {t("results")}
        </h2>
        <span className="text-sm text-muted-foreground">{tMaps("inThisArea", { count: items.length })}</span>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {sorted.map(({ item, near }) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={item.id === selectedId ? "true" : undefined}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/60", item.id === selectedId && "bg-muted")}
              >
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: item.kind === "listing" ? MAP_COLORS.olive : MAP_COLORS.terracotta }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{item.name ?? t("unnamedShop")}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {item.kind === "listing" ? t("layerListings") : item.categories.map((c) => t(`category.${c}`)).join(", ")}
                  </span>
                </span>
                {near && (
                  <span className="tabular shrink-0 text-sm text-muted-foreground" dir="ltr">
                    {format.number(near.km, { maximumFractionDigits: near.km < 10 ? 1 : 0 })} km
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
