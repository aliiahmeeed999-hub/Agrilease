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
import { useOwnerBookings } from "@/features/owner/hooks/useOwnerBookings";
import { OwnerBookingRow } from "@/features/owner/components/OwnerBookingRow";
import type { BookingStatus } from "@/generated/prisma/enums";

const FILTERS: (BookingStatus | "ALL")[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

export default function OwnerBookingsPage() {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useOwnerBookings();
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");

  const bookings = data?.bookings ?? [];
  const filtered = filter === "ALL" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <PageShell>
      <PageHeader title={t("bookingsTitle")} description={t("bookingsSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title={t("couldNotLoadBookings")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as BookingStatus | "ALL")}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f}>
                {f === "ALL" ? tCommon("all") : tCommon(`bookingStatus.${f}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-5">
            {filtered.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t("noBookingsHere")}
                description={t("noBookingsFilterDescription")}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map((booking) => (
                  <OwnerBookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      )}
    </PageShell>
  );
}
