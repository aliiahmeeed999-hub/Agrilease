"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useOwnerCalendarItems } from "@/features/owner/hooks/useOwnerCalendarItems";
import { CalendarView } from "@/features/calendar/components/CalendarView";

export default function OwnerCalendarPage() {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useOwnerCalendarItems();

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.ownerCalendar")} description={t("calendarSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          <Skeleton className="h-80 w-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoadCalendar")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data && <CalendarView items={data.items} />}
    </PageShell>
  );
}
