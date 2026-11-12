"use client";

import { Link } from "@/i18n/navigation";
import { Plus, Sprout } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useFarms } from "@/features/farms/hooks/useFarms";
import { FarmCard } from "@/features/farms/components/FarmCard";

export default function FarmsPage() {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useFarms();

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/farms/new" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            {t("addFarm")}
          </Link>
        }
      />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoadList")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data && data.farms.length === 0 && (
        <EmptyState
          icon={Sprout}
          title={t("noFarms")}
          description={t("noFarmsDescription")}
          action={
            <Link href="/farms/new" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              {t("addFarm")}
            </Link>
          }
        />
      )}

      {data && data.farms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.farms.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
