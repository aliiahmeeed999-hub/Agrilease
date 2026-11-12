"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useCalendarItems } from "@/features/calendar/hooks/useCalendarItems";
import { CalendarView } from "@/features/calendar/components/CalendarView";

export default function CalendarPage() {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useCalendarItems();

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          <Skeleton className="h-80 w-full rounded-3xl lg:w-80" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      )}

      {isError && (
        <ErrorState
          title={t("couldNotLoad")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && <CalendarView items={data.items} />}
    </PageShell>
  );
}
