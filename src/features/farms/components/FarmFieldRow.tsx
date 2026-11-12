"use client";

import { useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Droplets, History, Pencil, Sprout, X } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, Flip } from "@/lib/gsap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayLabel } from "@/utils/format";
import { cn } from "@/utils/cn";
import { FieldForm } from "@/features/farms/components/FieldForm";
import { CropCycleHistory } from "@/features/farms/components/CropCycleHistory";
import { IrrigationPanel } from "@/features/farms/components/IrrigationPanel";
import type { FarmFieldItem } from "@/types/farm";

// Same vocabulary as status-style.ts: growing is "in motion", harvested is
// "done", fallow is "inactive".
const FIELD_STATUS_STYLE: Record<string, string> = {
  GROWING: "bg-primary/15 text-primary",
  HARVESTED: "bg-success/15 text-success",
  FALLOW: "bg-muted text-muted-foreground",
};

type ExpandedView = "none" | "edit" | "history" | "irrigation";

export function FarmFieldRow({ farmId, field }: { farmId: string; field: FarmFieldItem }) {
  const t = useTranslations("fields");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const format = useFormatter();
  const [expandedView, setExpandedView] = useState<ExpandedView>("none");
  const isEditing = expandedView === "edit";
  const cardRef = useRef<HTMLDivElement | null>(null);
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  function toggleView(next: ExpandedView) {
    const grid = cardRef.current?.parentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (grid && !reducedMotion) {
      // Kill any in-flight tweens (e.g. a scroll reveal) on the sibling cards first, so
      // Flip always captures a stable rect instead of fighting an animation in progress.
      gsap.killTweensOf(grid.children);
      flipStateRef.current = Flip.getState(grid.children);
    }

    setExpandedView(next);
  }

  useGSAP(() => {
    if (!flipStateRef.current) return;
    Flip.from(flipStateRef.current, {
      duration: 0.4,
      ease: "power2.inOut",
      nested: true,
    });
    flipStateRef.current = null;
  }, [expandedView]);

  // History and irrigation are toggles: the pressed one is marked, and
  // pressing it again (or "Close") collapses the panel.
  function viewToggle(view: "history" | "irrigation", Icon: typeof History, label: string) {
    const active = expandedView === view;
    return (
      <Button
        size="sm"
        variant="outline"
        aria-pressed={active}
        className={cn(active && "border-primary/50 bg-primary/10 text-foreground")}
        onClick={() => toggleView(active ? "none" : view)}
      >
        <Icon aria-hidden="true" />
        {label}
      </Button>
    );
  }

  return (
    <Card ref={cardRef} className="gap-0 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sprout className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="type-headline text-foreground">{field.name}</h3>
            <Badge className={FIELD_STATUS_STYLE[field.status] ?? ""}>{tCommon(`fieldStatus.${field.status}`)}</Badge>
          </div>
          <p className="tabular mt-0.5 text-sm text-muted-foreground">
            {tCommon(`crop.${field.cropType}`)} · {format.number(field.areaHectares)} {tCommon("unitHectare")}
          </p>
        </div>
      </div>

      {!isEditing && (field.plantedAt || field.expectedHarvestAt) && (
        <p className="mt-3 text-sm text-muted-foreground">
          {field.plantedAt && t("planted", { date: formatDayLabel(field.plantedAt, locale) })}
          {field.plantedAt && field.expectedHarvestAt ? " · " : ""}
          {field.expectedHarvestAt && t("harvestExpected", { date: formatDayLabel(field.expectedHarvestAt, locale) })}
        </p>
      )}

      {isEditing && (
        <div className="mt-5 border-t border-border pt-5">
          <FieldForm
            farmId={farmId}
            field={field}
            defaultCenterLat={field.centerLat}
            defaultCenterLng={field.centerLng}
            onSaved={() => toggleView("none")}
            onCancel={() => toggleView("none")}
          />
        </div>
      )}

      {!isEditing && (
        <div role="group" aria-label={t("actionsLabel", { name: field.name })} className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => toggleView("edit")}>
            <Pencil aria-hidden="true" />
            {tCommon("edit")}
          </Button>
          {viewToggle("history", History, t("history"))}
          {viewToggle("irrigation", Droplets, t("irrigation"))}
          {(expandedView === "history" || expandedView === "irrigation") && (
            <Button size="sm" variant="ghost" className="ms-auto" onClick={() => toggleView("none")}>
              <X aria-hidden="true" />
              {tCommon("close")}
            </Button>
          )}
        </div>
      )}

      {expandedView === "history" && <CropCycleHistory fieldId={field.id} />}
      {expandedView === "irrigation" && <IrrigationPanel fieldId={field.id} />}
    </Card>
  );
}
