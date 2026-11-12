"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useBankerDashboard } from "@/features/banker/hooks/useBankerDashboard";
import { BankerStatTilesRow } from "@/features/banker/components/BankerStatTilesRow";

export default function BankerDashboardPage() {
  const t = useTranslations("bankerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useBankerDashboard();

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.dashboard")} description={t("dashboardSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title={t("couldNotLoadDashboard")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && <BankerStatTilesRow summary={data} />}
    </PageShell>
  );
}
