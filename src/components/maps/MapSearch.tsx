"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMapContext } from "@/components/maps/BaseMap";
import { apiRequest, ApiError } from "@/services/api-client";
import type { GeoSearchResult } from "@/types/geodata";

// Place search over the map (towns, communes, landmarks in Morocco). Searches
// on submit rather than per keystroke: the OpenStreetMap geocoder's usage
// policy forbids autocomplete, and it is kinder on slow connections.
export function MapSearch({ onPick }: { onPick?: (result: GeoSearchResult) => void }) {
  const t = useTranslations("maps");
  const locale = useLocale();
  const ctx = useMapContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiRequest<{ results: GeoSearchResult[] }>(
        `/api/geo/search?q=${encodeURIComponent(query.trim())}&lang=${locale}`
      );
      setResults(data.results);
    } catch (err) {
      setResults(null);
      setError(err instanceof ApiError && err.status === 429 ? t("searchRateLimited") : t("searchUnavailable"));
    } finally {
      setBusy(false);
    }
  }

  function pick(r: GeoSearchResult) {
    setResults(null);
    setQuery(r.label.split(",")[0]);
    if (ctx) {
      if (r.bbox) {
        const [s, w, n, e] = r.bbox;
        ctx.map.fitBounds([[w, s], [e, n]], { padding: 40, maxZoom: 14 });
      } else {
        ctx.map.flyTo({ center: [r.lng, r.lat], zoom: 13 });
      }
    }
    onPick?.(r);
  }

  return (
    <div className="absolute start-3 top-3 z-[7] w-[min(20rem,calc(100%-4.5rem))]">
      <form role="search" onSubmit={submit} className="flex items-center rounded-lg border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <label htmlFor="map-search" className="sr-only">
          {t("searchPlace")}
        </label>
        <input
          id="map-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlace")}
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-s-lg bg-transparent ps-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label={t("search")}
          className="flex size-10 shrink-0 items-center justify-center rounded-e-lg text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <Search className="size-4.5" aria-hidden="true" />
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-destructive shadow-sm">
          {error}
        </p>
      )}
      {results && (
        <ul className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-sm" aria-live="polite">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t("noPlacesFound")}</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => pick(r)} className="flex w-full items-start gap-2 px-3 py-2 text-start text-sm hover:bg-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="line-clamp-2">{r.label}</span>
              </button>
            </li>
          ))}
          <li className="border-t border-border px-3 pt-1.5 pb-1 text-xs text-muted-foreground">© OpenStreetMap</li>
        </ul>
      )}
    </div>
  );
}
