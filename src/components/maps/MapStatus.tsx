"use client";

import { Loader2, RotateCw, ZoomIn, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

// A small status chip at the top centre of the map: loading, "zoom in to
// load", or an error with retry. Announced to screen readers.
export function MapStatus({
  state,
  message,
  onRetry,
}: {
  state: "idle" | "loading" | "zoomIn" | "error" | "info";
  message?: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("maps");
  if (state === "idle") return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[6] flex justify-center px-16">
      <div
        role={state === "error" ? "alert" : "status"}
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground shadow-sm"
      >
        {state === "loading" && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />}
        {state === "zoomIn" && <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        {state === "error" && <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />}
        <span className="truncate">{message ?? (state === "loading" ? t("loadingData") : "")}</span>
        {state === "error" && onRetry && (
          <button type="button" onClick={onRetry} className="ms-1 flex items-center gap-1 font-medium text-primary hover:underline">
            <RotateCw className="size-3.5" aria-hidden="true" />
            {t("retry")}
          </button>
        )}
      </div>
    </div>
  );
}
