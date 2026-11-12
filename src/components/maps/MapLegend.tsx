"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";

export type LegendSwatch =
  | { kind: "fill"; color: string; dashed?: boolean }
  | { kind: "line"; color: string; dashed?: boolean; width?: number }
  | { kind: "point"; color: string }
  | { kind: "gradient"; stops: string[]; min: string; max: string };

export interface LegendItem {
  label: string;
  swatch: LegendSwatch;
}

function Swatch({ swatch }: { swatch: LegendSwatch }) {
  if (swatch.kind === "gradient") return null;
  if (swatch.kind === "point") {
    return <span className="size-3 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" style={{ background: swatch.color }} />;
  }
  if (swatch.kind === "line") {
    return (
      <span
        className="h-0 w-5 shrink-0"
        style={{ borderTop: `${swatch.width ?? 3}px ${swatch.dashed ? "dashed" : "solid"} ${swatch.color}` }}
      />
    );
  }
  return (
    <span
      className="size-3.5 shrink-0 rounded-[3px]"
      style={{
        background: `${swatch.color}66`,
        border: `1.5px ${swatch.dashed ? "dashed" : "solid"} ${swatch.color}`,
      }}
    />
  );
}

// Map key, in the map's leading bottom corner. Collapsible so it never covers
// the map on a phone; the same items are also listed as text, which is what
// screen readers get.
export function MapLegend({
  title,
  items,
  footer,
  defaultOpen = true,
  className,
}: {
  title: string;
  items: LegendItem[];
  footer?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const t = useTranslations("maps");
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        "absolute start-3 bottom-12 z-[5] max-w-[min(18rem,calc(100%-1.5rem))] rounded-lg border border-border bg-card/95 text-sm shadow-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-9 w-full items-center gap-2 px-3 text-start font-medium text-foreground"
      >
        <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1">{title}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        <span className="sr-only">{open ? t("hideLegend") : t("showLegend")}</span>
      </button>
      {open && (
        <div className="border-t border-border px-3 pt-2 pb-3">
          <ul className="flex flex-col gap-1.5">
            {items.map((item) =>
              item.swatch.kind === "gradient" ? (
                <li key={item.label}>
                  <p className="text-muted-foreground">{item.label}</p>
                  <div aria-hidden="true" className="mt-1 h-2.5 w-full rounded-sm" style={{ background: `linear-gradient(to right, ${item.swatch.stops.join(",")})` }} />
                  <div className="mt-0.5 flex justify-between text-xs text-muted-foreground" dir="ltr">
                    <span>{item.swatch.min}</span>
                    <span>{item.swatch.max}</span>
                  </div>
                </li>
              ) : (
                <li key={item.label} className="flex items-center gap-2">
                  <Swatch swatch={item.swatch} />
                  <span className="text-foreground">{item.label}</span>
                </li>
              )
            )}
          </ul>
          {footer && <div className="mt-2 border-t border-border pt-2 text-xs leading-snug text-muted-foreground">{footer}</div>}
        </div>
      )}
    </div>
  );
}
