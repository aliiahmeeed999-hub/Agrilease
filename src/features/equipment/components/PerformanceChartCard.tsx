"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardState } from "@/components/states/CardState";
import { PerformanceLineChart } from "@/components/charts/PerformanceLineChart";
import { TrendingUp } from "lucide-react";
import { useEquipmentPerformance } from "@/features/equipment/hooks/useEquipment";
import { useErrorReport } from "@/hooks/useErrorReport";
import { CARD_TIER_2 } from "@/utils/card-tiers";

export function PerformanceChartCard({
  equipmentId,
  onErrorChange,
}: {
  equipmentId: string;
  onErrorChange?: (isError: boolean) => void;
}) {
  const { data, isPending, isError, refetch } = useEquipmentPerformance(equipmentId, 10);
  useErrorReport(isError, onErrorChange);

  return (
    <Card className={`p-5 ${CARD_TIER_2}`}>
      <div className="flex items-center justify-between">
        <h2 className="type-headline text-foreground">Equipment performance</h2>
        <span className="text-xs text-muted-foreground">10 days</span>
      </div>

      <div className="mt-4">
        {isPending && (
          <CardState state="loading" loadingSkeleton={<Skeleton className="h-56 rounded-xl" />} />
        )}
        {isError && <CardState state="error" title="Couldn't load performance data" onRetry={() => refetch()} />}
        {data && data.samples.length === 0 && (
          <CardState state="empty" icon={TrendingUp} title="No performance data yet" description="Daily usage stats will appear here." />
        )}
        {data && data.samples.length > 0 && <PerformanceLineChart samples={data.samples} />}
      </div>
    </Card>
  );
}
