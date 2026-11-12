"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";
import { StatTilesRow } from "@/features/dashboard/components/StatTilesRow";
import { FieldMapCard } from "@/features/dashboard/components/FieldMapCard";
import { EquipmentReadinessCard } from "@/features/dashboard/components/EquipmentReadinessCard";
import { WorkloadChartCard } from "@/features/dashboard/components/WorkloadChartCard";
import { FarmWeatherCard } from "@/features/farms/components/FarmWeatherCard";
import { useFarms } from "@/features/farms/hooks/useFarms";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { data, isPending, isError, refetch } = useDashboardSummary();
  // The dashboard summary aggregates across every farm the farmer owns, so
  // there's no single "the" farm to show weather for - showing the first
  // farm's conditions is a reasonable default for the common case (one farm)
  // without needing a farm-picker on the dashboard itself; the farm detail
  // page (FarmWeatherCard there too) is where a farmer with multiple farms
  // checks the others.
  const { data: farmsData } = useFarms();
  const primaryFarmId = farmsData?.farms[0]?.id;

  return (
    <PageShell>
      <PageHeader
        title={data ? t("welcomeBack", { name: data.farmer.fullName.split(" ")[0] }) : t("title")}
        description={t("subtitle")}
      />

      {isPending && <DashboardSkeleton />}

      {isError && (
        <ErrorState
          title={t("couldNotLoad")}
          description={t("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <StatTilesRow stats={data.stats} />
          <FieldMapCard fields={data.fields} />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <EquipmentReadinessCard equipment={data.equipmentReadiness} />
            <WorkloadChartCard days={data.workload.days} />
            {primaryFarmId && <FarmWeatherCard farmId={primaryFarmId} />}
          </div>
        </div>
      )}
    </PageShell>
  );
}
