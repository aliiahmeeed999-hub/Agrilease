"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useAdminAnalyticsSummary } from "@/features/admin/hooks/useAdminAnalyticsSummary";
import { AdminStatTilesRow } from "@/features/admin/components/AdminStatTilesRow";
import { BookingFunnelChart } from "@/features/admin/components/BookingFunnelChart";
import { AdminBreakdownList } from "@/features/admin/components/AdminBreakdownList";
import { Card } from "@/components/ui/card";

function AdminAnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useAdminAnalyticsSummary();

  return (
    <PageShell>
      <PageHeader title={t("analyticsTitle")} description={t("analyticsSubtitle")} />

      {isPending && <AdminAnalyticsSkeleton />}

      {isError && (
        <ErrorState
          title={t("couldNotLoadAnalytics")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <AdminStatTilesRow summary={data} />

          <Card className="gap-0 p-5">
            <h2 className="type-headline mb-2 text-foreground">{t("bookingStatusTitle")}</h2>
            <BookingFunnelChart byStatus={data.bookings.byStatus} />
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminBreakdownList title={t("equipmentByType")} counts={data.equipment.byType} labelNamespace="equipmentType" />
            <AdminBreakdownList title={t("fieldsByCrop")} counts={data.fields.byCropType} labelNamespace="crop" />
          </div>
        </div>
      )}
    </PageShell>
  );
}
