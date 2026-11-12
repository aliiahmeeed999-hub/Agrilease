"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { BackLink } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useMarketplaceEquipmentDetail } from "@/features/marketplace/hooks/useMarketplaceEquipmentDetail";
import { MarketplaceEquipmentDetailCard } from "@/features/marketplace/components/MarketplaceEquipmentDetailCard";
import { ConditionReportCard } from "@/features/marketplace/components/ConditionReportCard";
import { BookingRequestForm } from "@/features/marketplace/components/BookingRequestForm";
import { BuyOrBorrowForm } from "@/features/marketplace/components/BuyOrBorrowForm";
import { EquipmentReviewsCard } from "@/features/marketplace/components/EquipmentReviewsCard";

export default function MarketplaceDetailPage() {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const params = useParams<{ id: string }>();
  const { data, isPending, isError, refetch } = useMarketplaceEquipmentDetail(params.id);

  const isRentable = data && (data.listingType === "RENT" || data.listingType === "RENT_AND_SALE");
  const isSellable = data && (data.listingType === "SALE" || data.listingType === "RENT_AND_SALE");

  return (
    <PageShell>
      <BackLink href="/marketplace" label={t("backToMarketplace")} className="mb-4" />

      {isPending && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}

      {isError && (
        <ErrorState
          title={t("couldNotLoadListing")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <div className="flex flex-col gap-6">
          {/* Source order is details, then the rent/buy forms, then the
              condition report: on a phone the action follows the price
              directly. On wide screens the forms move to a second column. */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <MarketplaceEquipmentDetailCard equipment={data} />
            <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {isRentable && <BookingRequestForm equipment={data} />}
              {isSellable && <BuyOrBorrowForm equipment={data} />}
            </div>
            <div className="lg:col-start-1">
              <ConditionReportCard condition={data.condition} report={data.conditionReport} />
            </div>
          </div>
          <EquipmentReviewsCard equipment={data} />
        </div>
      )}
    </PageShell>
  );
}
