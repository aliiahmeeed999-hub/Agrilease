"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { useAdminActivityLog } from "@/features/admin/hooks/useAdminActivityLog";
import { ActivityLogRow } from "@/features/admin/components/ActivityLogRow";

export default function AdminActivityLogPage() {
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useAdminActivityLog({ page });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.activityLog")} description={t("activityLogSubtitle")} />

      {isPending && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title="Couldn't load the activity log"
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && data.entries.length === 0 && (
        <EmptyState icon={History} title={t("noActivityYet")} description="Admin actions will show up here." />
      )}

      {data && data.entries.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {data.entries.map((item) => (
              <ActivityLogRow key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("previous")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("pageOf", { page, totalPages })}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
