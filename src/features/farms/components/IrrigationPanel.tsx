"use client";

import { Droplets } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldIrrigation } from "@/features/farms/hooks/useFieldIrrigation";
import { ApiError } from "@/services/api-client";
import { cn } from "@/utils/cn";

export function IrrigationPanel({ fieldId }: { fieldId: string }) {
  const t = useTranslations("fields");
  const { data, isPending, isError, error } = useFieldIrrigation(fieldId, true);

  if (isPending) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        {error instanceof ApiError && error.code === "IRRIGATION_ESTIMATE_UNAVAILABLE"
          ? t("irrigationUnavailable")
          : t("irrigationLoadError")}
      </p>
    );
  }

  if (!data) return null;

  const needsWater = data.netIrrigationNeedMm > 0;

  return (
    <section className="mt-4 flex flex-col gap-3">
      {/* The answer first, in one line a farmer can act on; the method and
          caveats follow in smaller type. */}
      <div className={cn("flex items-center gap-3 rounded-xl p-3.5", needsWater ? "bg-info/10" : "bg-success/10")}>
        <Droplets className={cn("size-5 shrink-0", needsWater ? "text-info" : "text-success")} aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">
          {needsWater ? t("irrigationRecommended", { amount: data.netIrrigationNeedMm }) : t("noIrrigationNeeded")}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("irrigationBasis", { days: data.windowDays, etc: data.etcTotalMm, rainfall: data.effectiveRainfallMm })}
        {data.soilWaterHoldingCapacityMm !== null && <> {t("irrigationCapacity", { capacity: data.soilWaterHoldingCapacityMm })}</>}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("irrigationDisclaimer")}</p>
    </section>
  );
}
