"use client";

import { Link } from "@/i18n/navigation";
import { Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useWorkers } from "@/features/workers/hooks/useWorkers";
import { WorkerRow } from "@/features/workers/components/WorkerRow";

export default function WorkersPage() {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useWorkers();

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/workers/new" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            {t("addWorker")}
          </Link>
        }
      />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data && data.workers.length === 0 && (
        <EmptyState
          icon={Users}
          title={t("noWorkers")}
          description={t("noWorkersDescription")}
          action={
            <Link href="/workers/new" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              {t("addWorker")}
            </Link>
          }
        />
      )}

      {data && data.workers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.workers.map((worker) => (
            <WorkerRow key={worker.id} worker={worker} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
