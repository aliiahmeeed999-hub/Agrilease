"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { IControl, LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import { isRtlLocale } from "@/i18n/routing";
import { cn } from "@/utils/cn";
import { loadMapLibre, type MapLibreModule } from "@/components/maps/maplibre";
import { applyBasemapTheme, BASEMAP_STYLE_URL, DEFAULT_CENTER } from "@/components/maps/map-theme";

export type MapInitialView = { center: [number, number]; zoom: number } | { bounds: LngLatBoundsLike; maxZoom?: number };

interface MapContextValue {
  map: MapLibreMap;
  maplibre: MapLibreModule;
  // Returns the map to its initial view (also used by the "Reset view" control).
  resetView: () => void;
}

const MapContext = createContext<MapContextValue | null>(null);

// For map layers and overlays rendered as children of <BaseMap>. Null until
// the style has loaded.
export function useMapContext() {
  return useContext(MapContext);
}

interface BaseMapProps {
  initialView: MapInitialView;
  // Short description of what the map shows, read by screen readers.
  ariaLabel: string;
  className?: string;
  // Embedded maps (inside a scrolling page) need two fingers / Ctrl+scroll to
  // move, so the page can still be scrolled past them. Full-page maps don't.
  cooperativeGestures?: boolean;
  showGeolocate?: boolean;
  showFullscreen?: boolean;
  children?: ReactNode;
}

function viewToCamera(view: MapInitialView) {
  return "center" in view ? { center: view.center, zoom: view.zoom } : undefined;
}

// The one MapLibre map component. Owns the map's whole lifecycle: created
// once per mount (never re-created on re-render), resized with its container,
// and removed (with its WebGL context and listeners) on unmount. Business
// layers are children that read the map from context.
export function BaseMap({
  initialView,
  ariaLabel,
  className,
  cooperativeGestures = false,
  showGeolocate = false,
  showFullscreen = true,
  children,
}: BaseMapProps) {
  const t = useTranslations("maps");
  const locale = useLocale();
  const rtl = isRtlLocale(locale);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ctx, setCtx] = useState<MapContextValue | null>(null);
  const [failed, setFailed] = useState(false);
  // Captured once: later changes to these props must not rebuild the map.
  const initialRef = useRef({ initialView, cooperativeGestures, showGeolocate, showFullscreen, locale, rtl, t });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let observer: ResizeObserver | null = null;
    const init = initialRef.current;

    loadMapLibre()
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;
        map = new maplibre.Map({
          container: containerRef.current,
          style: BASEMAP_STYLE_URL,
          center: DEFAULT_CENTER,
          zoom: 6,
          ...viewToCamera(init.initialView),
          ...("bounds" in init.initialView
            ? { bounds: init.initialView.bounds, fitBoundsOptions: { padding: 48, maxZoom: init.initialView.maxZoom ?? 16 } }
            : {}),
          cooperativeGestures: init.cooperativeGestures,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxPitch: 0,
          locale: {
            "NavigationControl.ZoomIn": init.t("zoomIn"),
            "NavigationControl.ZoomOut": init.t("zoomOut"),
            "FullscreenControl.Enter": init.t("enterFullscreen"),
            "FullscreenControl.Exit": init.t("exitFullscreen"),
            "GeolocateControl.FindMyLocation": init.t("findMyLocation"),
            "GeolocateControl.LocationNotAvailable": init.t("locationUnavailable"),
            "CooperativeGesturesHandler.WindowsHelpText": init.t("gestureHelpDesktop"),
            "CooperativeGesturesHandler.MacHelpText": init.t("gestureHelpMac"),
            "CooperativeGesturesHandler.MobileHelpText": init.t("gestureHelpMobile"),
          },
        });
        map.getCanvas().setAttribute("aria-label", init.t("canvasLabel"));

        const position = init.rtl ? "top-left" : "top-right";
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), position);

        const resetView = () => {
          if (!map) return;
          const view = init.initialView;
          if ("center" in view) map.easeTo({ center: view.center, zoom: view.zoom });
          else map.fitBounds(view.bounds, { padding: 48, maxZoom: view.maxZoom ?? 16 });
        };
        map.addControl(new ResetViewControl(init.t("resetView"), resetView), position);
        if (init.showFullscreen && wrapperRef.current) {
          map.addControl(new maplibre.FullscreenControl({ container: wrapperRef.current }), position);
        }
        if (init.showGeolocate) {
          // Asks the browser for the location only when the button is pressed.
          map.addControl(new maplibre.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false }), position);
        }
        map.addControl(new maplibre.ScaleControl({ unit: "metric" }), init.rtl ? "bottom-right" : "bottom-left");

        map.on("error", (e) => {
          // A style that never loads (offline, provider down) leaves a blank
          // canvas; say so instead. Tile-level errors are left to retry.
          if (!map?.isStyleLoaded() && (e.error as { status?: number } | undefined)?.status !== 404) setFailed(true);
        });

        map.once("load", () => {
          if (cancelled || !map) return;
          applyBasemapTheme(map, init.locale);
          // Start with the attribution folded into its (i) button; it opens on tap.
          containerRef.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
          setFailed(false);
          setCtx({ map, maplibre, resetView });
        });

        observer = new ResizeObserver(() => map?.resize());
        observer.observe(containerRef.current);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      observer?.disconnect();
      setCtx(null);
      map?.remove();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      role="region"
      aria-label={ariaLabel}
      className={cn("agri-map relative isolate size-full overflow-hidden rounded-xl border border-border bg-[#f6f2e9]", className)}
    >
      {/* size-full as well as inset-0: MapLibre's stylesheet makes this element
          position: relative, which would otherwise collapse it to zero height. */}
      <div ref={containerRef} className="absolute inset-0 size-full" />
      {!ctx && !failed && (
        <div className="absolute inset-0 flex items-center justify-center" aria-live="polite">
          <span className="rounded-lg bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm">{t("loadingMap")}</span>
        </div>
      )}
      {failed && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-xs rounded-lg bg-card px-4 py-3 text-sm text-foreground shadow-sm">{t("mapUnavailable")}</p>
        </div>
      )}
      {ctx && <MapContext.Provider value={ctx}>{children}</MapContext.Provider>}
    </div>
  );
}

class ResetViewControl implements IControl {
  private container: HTMLDivElement | null = null;
  constructor(
    private readonly label: string,
    private readonly onReset: () => void
  ) {}
  onAdd() {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "agri-map-reset";
    button.title = this.label;
    button.setAttribute("aria-label", this.label);
    button.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
    button.addEventListener("click", this.onReset);
    container.appendChild(button);
    this.container = container;
    return container;
  }
  onRemove() {
    this.container?.remove();
    this.container = null;
  }
}
