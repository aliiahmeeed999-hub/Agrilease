"use client";

import { Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useApprovedLoans } from "@/features/banker/hooks/useApprovedLoans";
import { ApprovedLoanRow } from "@/features/banker/components/ApprovedLoanRow";

export default function BankerLoansPage() {
  const t = useTranslations("bankerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useApprovedLoans();
  const loans = data?.loans ?? [];

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.approvedLoans")} description={t("loansSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoadLoans")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data &&
        (loans.length === 0 ? (
          <EmptyState icon={Landmark} title={t("noLoansYet")} description={t("noLoansDescription")} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {loans.map((loan) => (
              <ApprovedLoanRow key={loan.id} loan={loan} />
            ))}
          </div>
        ))}
    </PageShell>
  );
}
