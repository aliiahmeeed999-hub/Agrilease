"use client";

import { useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { RetryAllBanner } from "@/components/states/RetryAllBanner";
import { useEquipmentDetail } from "@/features/equipment/hooks/useEquipment";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ROLE_HOME } from "@/lib/constants";
import { EquipmentSelectorStrip } from "@/features/equipment/components/EquipmentSelectorStrip";
import { EquipmentInfoCard } from "@/features/equipment/components/EquipmentInfoCard";
import { EquipmentMapCard } from "@/features/equipment/components/EquipmentMapCard";
import { PerformanceChartCard } from "@/features/equipment/components/PerformanceChartCard";
import { AlertsFeed } from "@/features/equipment/components/AlertsFeed";
import { MaintenanceCard } from "@/features/equipment/components/MaintenanceCard";

function EquipmentDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-1">
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export default function EquipmentDetailPage() {
  const tNav = useTranslations("common.nav");
  const params = useParams<{ id: string }>();
  const equipmentId = params.id;
  const { data: equipment, isPending, isError, refetch } = useEquipmentDetail(equipmentId);
  const { data: currentUser } = useCurrentUser();
  const homeHref = currentUser ? ROLE_HOME[currentUser.user.role] : "/dashboard";
  const queryClient = useQueryClient();

  // Alerts/Performance/the map's track query/Maintenance each own an
  // independent useQuery, so they can fail independently of each other and
  // of the base equipment-detail query above. Each reports its own error
  // state up here (without lifting the query itself, so each card's own
  // "Try again" still only retries that card) purely so this page can decide
  // whether 2+ have failed at once and offer one "retry all" action.
  const [failedWidgets, setFailedWidgets] = useState<Set<string>>(new Set());
  const reportError = useCallback((key: string, hasError: boolean) => {
    setFailedWidgets((prev) => {
      // Bail out and return the exact same Set reference when nothing
      // actually changed - useErrorReport's effect re-fires on every render
      // of the child (its onErrorChange prop is a fresh closure each time),
      // so without this guard every render would produce a new Set here,
      // which re-renders this page, which creates fresh closures again: an
      // infinite loop. Returning `prev` unchanged makes React bail out of
      // the re-render (useState compares via Object.is), breaking the cycle.
      if (prev.has(key) === hasError) return prev;
      const next = new Set(prev);
      if (hasError) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const reportAlertsError = useCallback((v: boolean) => reportError("alerts", v), [reportError]);
  const reportMapError = useCallback((v: boolean) => reportError("map", v), [reportError]);
  const reportPerformanceError = useCallback((v: boolean) => reportError("performance", v), [reportError]);
  const reportMaintenanceError = useCallback((v: boolean) => reportError("maintenance", v), [reportError]);

  function retryAllWidgets() {
    queryClient.invalidateQueries({ queryKey: ["equipment", "alerts", equipmentId] });
    queryClient.invalidateQueries({ queryKey: ["equipment", "performance", equipmentId, 10] });
    queryClient.invalidateQueries({ queryKey: ["equipment", "track", equipmentId] });
    queryClient.invalidateQueries({ queryKey: ["equipment", equipmentId, "maintenance"] });
  }

  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-4">
        <Link
          href={homeHref}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {tNav("equipment")}
        </Link>
        <EquipmentSelectorStrip activeId={equipmentId} />
      </div>

      {isPending && <EquipmentDetailSkeleton />}

      {isError && (
        <ErrorState
          title="Couldn't load this equipment"
          description="It may have been removed, or you may not have access to it."
          onRetry={() => refetch()}
        />
      )}

      {equipment && (
        <>
          <RetryAllBanner failedCount={failedWidgets.size} totalCount={4} onRetryAll={retryAllWidgets} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-1">
              <EquipmentInfoCard equipment={equipment} />
              <AlertsFeed equipmentId={equipment.id} onErrorChange={reportAlertsError} />
            </div>
            <div className="flex flex-col gap-6 lg:col-span-2">
              <EquipmentMapCard equipment={equipment} onErrorChange={reportMapError} />
              <PerformanceChartCard equipmentId={equipment.id} onErrorChange={reportPerformanceError} />
              <MaintenanceCard
                equipmentId={equipment.id}
                isOwner={equipment.isOwner}
                onErrorChange={reportMaintenanceError}
              />
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
