"use client";

import { LineChart } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { StatValue } from "@/components/ui/stat-value";
import { useDemandForecast } from "@/features/ai/hooks/useDemandForecast";
import { DemandForecastChart } from "@/features/ai/components/DemandForecastChart";

const TYPE_LABEL: Record<string, string> = {
  TRACTOR: "Tractor",
  HARVESTER: "Harvester",
  SPRAYER: "Sprayer",
  PLOW: "Plow",
  TRAILER: "Trailer",
  IRRIGATION_PUMP: "Irrigation pump",
};

export default function ForecastPage() {
  const { data, isPending, isError, refetch } = useDemandForecast();

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Demand forecast</h1>
        <p className="text-sm text-muted-foreground">
          Projected equipment-hours needed across your fields over the next 8 weeks.
        </p>
      </div>

      {isPending && (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {isError && (
        <ErrorState
          title="Couldn't load the demand forecast"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {data && data.totalHoursNext8Weeks === 0 && (
        <EmptyState
          icon={LineChart}
          title="No demand projected yet"
          description="Once your fields have crop and harvest data, a forecast will show up here."
        />
      )}

      {data && data.totalHoursNext8Weeks > 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">Total equipment-hours, next 8 weeks</p>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                <StatValue value={data.totalHoursNext8Weeks} suffix="h" />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">Most in-demand type</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {TYPE_LABEL[data.topType] ?? data.topType}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 type-headline text-foreground">Weekly demand by equipment type</h2>
            <DemandForecastChart weeks={data.weeks} />
          </div>
        </div>
      )}
    </PageShell>
  );
}
