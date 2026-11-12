"use client";

import { useTranslations } from "next-intl";
import { MapPage } from "@/components/maps/MapPage";
import { Skeleton } from "@/components/ui/skeleton";
import { VegetationMap } from "@/features/vegetation/components/VegetationMap";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";

export default function VegetationMapPage() {
  const t = useTranslations("vegetationMap");
  // Field outlines of every farm come with the dashboard summary.
  const summary = useDashboardSummary();
  return (
    <MapPage title={t("title")} description={t("subtitle")}>
      {(farms) =>
        summary.isPending ? (
          <Skeleton className="h-[60dvh] min-h-[26rem] rounded-xl sm:h-[34rem]" aria-busy="true" />
        ) : (
          <VegetationMap farms={farms} fields={summary.data?.fields ?? []} />
        )
      }
    </MapPage>
  );
}
