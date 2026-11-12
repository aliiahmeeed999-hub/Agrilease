"use client";

import { Card } from "@/components/ui/card";
import { CardState } from "@/components/states/CardState";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MapPinned, Timer, Route, ListChecks } from "lucide-react";
import { useEquipmentTrack } from "@/features/equipment/hooks/useEquipment";
import { useErrorReport } from "@/hooks/useErrorReport";
import { formatDuration, formatDistance } from "@/utils/format";
import { CARD_TIER_1 } from "@/utils/card-tiers";
import type { EquipmentDetail } from "@/types/equipment";

// MapLibre (~1 MB) loads only when this card renders.
const EquipmentRouteMap = dynamic(
  () => import("@/features/equipment/components/EquipmentRouteMap").then((m) => m.EquipmentRouteMap),
  { ssr: false, loading: () => <Skeleton className="size-full rounded-xl" /> }
);

export function EquipmentMapCard({
  equipment,
  onErrorChange,
}: {
  equipment: EquipmentDetail;
  onErrorChange?: (isError: boolean) => void;
}) {
  const t = useTranslations("routeMap");
  const { data, isPending, isError, refetch } = useEquipmentTrack(equipment.id);
  useErrorReport(isError, onErrorChange);

  return (
    <Card className={`${CARD_TIER_1} gap-0 p-0`}>
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="type-headline text-foreground">{t("title")}</h2>
        <span className="text-sm text-muted-foreground">{t("today")}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border px-5 py-3">
        <StatItem icon={Timer} label={t("runningHours")} value={formatDuration(equipment.stats.runningHoursSeconds)} />
        <div className="hidden h-8 w-px bg-border sm:block" />
        <StatItem icon={Route} label={t("distance")} value={formatDistance(equipment.stats.distanceKmThisWeek)} />
        <div className="hidden h-8 w-px bg-border sm:block" />
        <StatItem icon={ListChecks} label={t("tasks")} value={`${equipment.stats.tasksCompleted}/${equipment.stats.tasksTotal}`} />
      </div>

      <div className="h-72 p-5 sm:h-80">
        {isPending ? (
          <CardState state="loading" loadingSkeleton={<Skeleton className="size-full rounded-xl" />} />
        ) : isError ? (
          <CardState state="error" title={t("couldNotLoad")} onRetry={() => refetch()} />
        ) : !data || (data.points.length === 0 && !equipment.currentLat) ? (
          <CardState
            state="empty"
            icon={MapPinned}
            title={t("noPosition")}
            description={t("noPositionDescription")}
          />
        ) : (
          <EquipmentRouteMap points={data.points} currentLat={equipment.currentLat} currentLng={equipment.currentLng} />
        )}
      </div>
    </Card>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold tabular-nums" dir="ltr">{value}</span>
    </div>
  );
}
