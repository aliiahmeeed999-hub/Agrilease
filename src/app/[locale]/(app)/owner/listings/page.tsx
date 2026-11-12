"use client";

import { Link } from "@/i18n/navigation";
import { Plus, Tractor } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useOwnerEquipment } from "@/features/owner/hooks/useOwnerEquipment";
import { OwnerListingRow } from "@/features/owner/components/OwnerListingRow";

export default function OwnerListingsPage() {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useOwnerEquipment();
  const addLink = (
    <Link href="/owner/listings/new" className={buttonVariants()}>
      <Plus aria-hidden="true" />
      {t("addEquipment")}
    </Link>
  );

  return (
    <PageShell>
      <PageHeader title={t("listingsTitle")} description={t("listingsSubtitle")} actions={addLink} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title={t("couldNotLoadEquipment")}
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && data.equipment.length === 0 && (
        <EmptyState icon={Tractor} title={t("noEquipmentYet")} description={t("noEquipmentDescription")} action={addLink} />
      )}

      {data && data.equipment.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.equipment.map((item) => (
            <OwnerListingRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
