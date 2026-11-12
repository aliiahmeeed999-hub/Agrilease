"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";
import { formatDayLabel } from "@/utils/format";
import { useCropCycles, useCloseCropCycle } from "@/features/farms/hooks/useCropCycles";

function CloseCycleForm({ fieldId, cycleId, onDone }: { fieldId: string; cycleId: string; onDone: () => void }) {
  const t = useTranslations("cropCycles");
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const { submit, isSubmitting, error } = useCloseCropCycle(fieldId);
  const [actualYieldKg, setActualYieldKg] = useState("");
  const [harvestedAt, setHarvestedAt] = useState("");

  async function handleSubmit() {
    const parsed = Number(actualYieldKg);
    if (actualYieldKg.trim() === "" || !Number.isFinite(parsed) || parsed <= 0) return;
    const ok = await submit(cycleId, { actualYieldKg: parsed, harvestedAt: harvestedAt || undefined });
    if (ok) onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <Field label={t("actualYieldLabel")} htmlFor={`yield-${cycleId}`}>
          <Input
            id={`yield-${cycleId}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={actualYieldKg}
            onChange={(e) => setActualYieldKg(e.target.value)}
          />
        </Field>
        <Field label={t("harvestDateLabel")} htmlFor={`harvested-${cycleId}`}>
          <Input id={`harvested-${cycleId}`} type="date" value={harvestedAt} onChange={(e) => setHarvestedAt(e.target.value)} />
        </Field>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={isSubmitting || actualYieldKg.trim() === ""} onClick={handleSubmit}>
          {isSubmitting ? tCommon("saving") : tFields("closeCycle")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          {tCommon("cancel")}
        </Button>
      </div>
    </div>
  );
}

export function CropCycleHistory({ fieldId }: { fieldId: string }) {
  const t = useTranslations("cropCycles");
  const tFields = useTranslations("fields");
  const tCrop = useTranslations("common.crop");
  const locale = useLocale();
  const format = useFormatter();
  const { data, isPending, isError } = useCropCycles(fieldId);
  const [closingId, setClosingId] = useState<string | null>(null);

  return (
    <section className="mt-4 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">{tFields("cropCycleHistory")}</h3>

      {isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">{t("couldNotLoad")}</p>}

      {data && data.cycles.length === 0 && <p className="text-sm text-muted-foreground">{tFields("noCyclesYet")}</p>}

      {data && (
        <ul className="flex flex-col gap-2">
          {data.cycles.map((cycle) => (
            <li key={cycle.id} className="rounded-xl bg-muted/50 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{tCrop(cycle.cropType)}</p>
                {cycle.harvestedAt ? (
                  <Badge variant="success">{t("harvestedOn", { date: formatDayLabel(cycle.harvestedAt, locale) })}</Badge>
                ) : (
                  <Badge className="bg-primary/15 text-primary">{t("inProgress")}</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("plantedOn", { date: formatDayLabel(cycle.plantedAt, locale) })}
                {cycle.expectedHarvestAt && ` · ${t("expectedHarvestOn", { date: formatDayLabel(cycle.expectedHarvestAt, locale) })}`}
              </p>
              {cycle.actualYieldKg != null && (
                <p className="tabular mt-1 text-sm text-foreground">
                  {cycle.expectedYieldKg != null
                    ? t("yieldWithExpected", { actual: format.number(cycle.actualYieldKg), expected: format.number(cycle.expectedYieldKg) })
                    : t("yieldValue", { actual: format.number(cycle.actualYieldKg) })}
                </p>
              )}

              {!cycle.harvestedAt && closingId !== cycle.id && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setClosingId(cycle.id)}>
                  {tFields("closeCycle")}
                </Button>
              )}

              {closingId === cycle.id && (
                <CloseCycleForm fieldId={fieldId} cycleId={cycle.id} onDone={() => setClosingId(null)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
