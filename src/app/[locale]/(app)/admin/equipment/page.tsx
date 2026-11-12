"use client";

import { Tractor } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useAdminEquipment } from "@/features/admin/hooks/useAdminEquipment";
import { AdminEquipmentRow } from "@/features/admin/components/AdminEquipmentRow";

export default function AdminEquipmentPage() {
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useAdminEquipment();

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.listingsModeration")} description={t("listingsSubtitle")} />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title="Couldn't load equipment"
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && data.equipment.length === 0 && (
        <EmptyState icon={Tractor} title="No equipment yet" description="Equipment listings will show up here." />
      )}

      {data && data.equipment.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.equipment.map((item) => (
            <AdminEquipmentRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
