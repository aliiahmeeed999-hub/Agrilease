"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancingRequests } from "@/features/banker/hooks/useFinancingRequests";
import { FinancingRequestRow } from "@/features/banker/components/FinancingRequestRow";
import type { FinancingStatus } from "@/generated/prisma/enums";

const FILTER_VALUES: (FinancingStatus | "ALL")[] = [
  "ALL",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
];

export default function BankerFinancingPage() {
  const t = useTranslations("bankerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useFinancingRequests();
  const [filter, setFilter] = useState<FinancingStatus | "ALL">("ALL");

  const requests = data?.requests ?? [];
  const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.financingRequests")} description={t("financingSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title={t("couldNotLoadRequests")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FinancingStatus | "ALL")}>
          <TabsList className="mb-4">
            {FILTER_VALUES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value === "ALL" ? tCommon("all") : tCommon(`financingStatus.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            {filtered.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t("noRequestsHere")} description={t("noRequestsFilterDescription")} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map((request) => (
                  <FinancingRequestRow key={request.id} request={request} />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      )}
    </PageShell>
  );
}
