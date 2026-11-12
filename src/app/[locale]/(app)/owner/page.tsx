"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useOwnerDashboardSummary } from "@/features/owner/hooks/useOwnerDashboardSummary";
import { OwnerStatTilesRow } from "@/features/owner/components/OwnerStatTilesRow";
import { OwnerFleetList } from "@/features/owner/components/OwnerFleetList";
import { OwnerPendingBookingsCard } from "@/features/owner/components/OwnerPendingBookingsCard";

function OwnerDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

export default function OwnerDashboardPage() {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useOwnerDashboardSummary();

  return (
    <PageShell>
      <PageHeader
        title={data ? t("welcomeBack", { name: data.owner.fullName.split(" ")[0] }) : t("title")}
        description={t("dashboardSubtitle")}
      />

      {isPending && <OwnerDashboardSkeleton />}

      {isError && (
        <ErrorState
          title={t("couldNotLoadDashboard")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <div className="flex flex-col gap-8">
          <OwnerStatTilesRow stats={data.stats} />
          <OwnerPendingBookingsCard bookings={data.pendingBookings} />
          <OwnerFleetList equipment={data.equipment} />
        </div>
      )}
    </PageShell>
  );
}
