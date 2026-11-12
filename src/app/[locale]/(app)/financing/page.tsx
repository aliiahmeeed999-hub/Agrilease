"use client";

import { Calculator, Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useMyFinancingRequests } from "@/features/financing/hooks/useMyFinancingRequests";
import { FinancingRequestRow } from "@/features/financing/components/FinancingRequestRow";

export default function FinancingPage() {
  const t = useTranslations("financing");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useMyFinancingRequests();
  const requests = data?.requests ?? [];

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/financing/simulate" className={buttonVariants()}>
            <Calculator aria-hidden="true" />
            {t("newSimulation")}
          </Link>
        }
      />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data &&
        (requests.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={t("noRequestsYet")}
            description={t("noRequestsDescription")}
            action={
              <Link href="/financing/simulate" className={buttonVariants({ variant: "outline" })}>
                {t("newSimulation")}
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {requests.map((request) => (
              <FinancingRequestRow key={request.id} request={request} />
            ))}
          </div>
        ))}
    </PageShell>
  );
}
