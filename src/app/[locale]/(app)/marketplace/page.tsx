"use client";

import { useSearchParams } from "next/navigation";
import { Tractor } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader, SectionHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useMarketplaceEquipment } from "@/features/marketplace/hooks/useMarketplaceEquipment";
import { MarketplaceEquipmentCard } from "@/features/marketplace/components/MarketplaceEquipmentCard";
import { MarketplaceFilterBar } from "@/features/marketplace/components/MarketplaceFilterBar";
import type { MarketplaceFilters } from "@/services/marketplace.service";

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const tCategory = useTranslations("common.equipmentCategory");
  const searchParams = useSearchParams();

  const filters: MarketplaceFilters = {
    listingTypeFilter: (searchParams.get("listingTypeFilter") as MarketplaceFilters["listingTypeFilter"]) ?? undefined,
    category: (searchParams.get("category") as MarketplaceFilters["category"]) ?? undefined,
    condition: (searchParams.get("condition") as MarketplaceFilters["condition"]) ?? undefined,
    sort: (searchParams.get("sort") as MarketplaceFilters["sort"]) ?? undefined,
  };

  const { data, isPending, isError, refetch } = useMarketplaceEquipment(filters);

  const isEmpty = data && ((data.grouped && data.groups.length === 0) || (!data.grouped && data.items.length === 0));
  const hasActiveFilters = Boolean(filters.listingTypeFilter || filters.category || filters.condition || filters.sort);

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <MarketplaceFilterBar />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {isEmpty && (
        <EmptyState
          icon={Tractor}
          title={hasActiveFilters ? t("noResultsForFilters") : t("noListingsYet")}
          description={hasActiveFilters ? undefined : t("noListingsDescription")}
        />
      )}

      {data && !isEmpty && data.grouped && (
        <div className="flex flex-col gap-10">
          {data.groups.map((group) => (
            <section key={group.category}>
              <SectionHeader title={tCategory(group.category)} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <MarketplaceEquipmentCard key={item.id} item={item} showCategory={false} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {data && !isEmpty && !data.grouped && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <MarketplaceEquipmentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
