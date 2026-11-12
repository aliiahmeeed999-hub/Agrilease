"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { useAdminTransactions } from "@/features/admin/hooks/useAdminTransactions";
import { AdminTransactionRow } from "@/features/admin/components/AdminTransactionRow";

export default function AdminTransactionsPage() {
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useAdminTransactions(page);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.transactions")} description={t("transactionsSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title="Couldn't load transactions"
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && data.transactions.length === 0 && (
        <EmptyState icon={Receipt} title={t("noTransactionsYet")} description="Rentals and sales will show up here." />
      )}

      {data && data.transactions.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.transactions.map((item) => (
              <AdminTransactionRow key={item.id} item={item} />
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
