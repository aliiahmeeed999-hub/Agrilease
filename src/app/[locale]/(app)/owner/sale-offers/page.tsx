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
import { useOwnerSaleOffers } from "@/features/owner/hooks/useOwnerSaleOffers";
import { SaleOfferRow } from "@/features/owner/components/SaleOfferRow";
import type { BookingStatus } from "@/generated/prisma/enums";

const FILTER_VALUES: (BookingStatus | "ALL")[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default function OwnerSaleOffersPage() {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useOwnerSaleOffers();
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");

  const offers = data?.offers ?? [];
  const filtered = filter === "ALL" ? offers : offers.filter((o) => o.status === filter);

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.saleOffers")} description={t("saleOffersSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoadOffers")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
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
              <EmptyState icon={ClipboardList} title={t("noOffersHere")} description={t("noOffersFilterDescription")} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map((offer) => (
                  <SaleOfferRow key={offer.id} offer={offer} />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      )}
    </PageShell>
  );
}
