"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyBookings } from "@/features/rentals/hooks/useMyBookings";
import { RentalBookingRow } from "@/features/rentals/components/RentalBookingRow";
import type { BookingStatus, TransactionType } from "@/generated/prisma/enums";

const FILTER_VALUES: (BookingStatus | "ALL")[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

export function BookingListView({ initialType = "RENT" }: { initialType?: TransactionType }) {
  const t = useTranslations("rentals");
  const tCommon = useTranslations("common");
  const [type, setType] = useState<TransactionType>(initialType);
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");
  const { data, isPending, isError, refetch } = useMyBookings(undefined, type);

  const bookings = data?.bookings ?? [];
  const filtered = filter === "ALL" ? bookings : bookings.filter((b) => b.status === filter);

  const emptyTitle = type === "SALE" ? t("noPurchasesHere") : t("noRentalsHere");

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
        <TabsList className="mb-4">
          <TabsTrigger value="RENT">{t("rentalsToggle")}</TabsTrigger>
          <TabsTrigger value="SALE">{t("purchasesToggle")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as BookingStatus | "ALL")}>
          <TabsList className="mb-4">
            {FILTER_VALUES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value === "ALL" ? tCommon("all") : tCommon(`bookingStatus.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            {filtered.length === 0 ? (
              <EmptyState icon={ClipboardList} title={emptyTitle} description={t("noRentalsFilterDescription")} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map((booking) => (
                  <RentalBookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      )}
    </PageShell>
  );
}
