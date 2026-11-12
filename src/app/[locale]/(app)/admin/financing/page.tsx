"use client";

import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminFinancing } from "@/features/admin/hooks/useAdminFinancing";
import { AdminFinancingRow } from "@/features/admin/components/AdminFinancingRow";
import { FINANCING_OFFERS } from "@/lib/financing-offers";
import type { EquipmentCategory, FinancingStatus } from "@/generated/prisma/enums";

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  "TRACTOR",
  "COMBINE_HARVESTER",
  "TILLAGE",
  "SEEDING_PLANTING",
  "SPRAYER",
  "IRRIGATION",
  "TRANSPORT_TRAILER",
  "HARVESTING_OTHER",
  "UTILITY_VEHICLE",
  "OTHER",
];

const STATUSES: FinancingStatus[] = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];

export default function AdminFinancingPage() {
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const tCategory = useTranslations("common.equipmentCategory");

  const [region, setRegion] = useState("");
  const [category, setCategory] = useState<EquipmentCategory | "ALL">("ALL");
  const [status, setStatus] = useState<FinancingStatus | "ALL">("ALL");
  const [institution, setInstitution] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const institutions = useMemo(() => [...new Set(FINANCING_OFFERS.map((o) => o.institutionName))], []);

  const { data, isPending, isError, refetch } = useAdminFinancing({
    region: region.trim() || undefined,
    primaryEquipmentCategory: category === "ALL" ? undefined : category,
    status: status === "ALL" ? undefined : status,
    chosenOfferInstitution: institution === "ALL" ? undefined : institution,
    page,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.financing")} description={t("financingRequestsSubtitle")} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder={t("regionFilterLabel")}
          className="w-full sm:w-48"
          value={region}
          onChange={(e) => {
            setRegion(e.target.value);
            setPage(1);
          }}
        />

        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v as EquipmentCategory | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="w-full sm:w-48">
            <SelectValue placeholder={t("equipmentCategoryFilterLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allCategories")}</SelectItem>
            {EQUIPMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {tCategory(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as FinancingStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="w-full sm:w-44">
            <SelectValue placeholder={t("statusFilterLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tCommon(`financingStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={institution}
          onValueChange={(v) => {
            setInstitution(v ?? "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="w-full sm:w-52">
            <SelectValue placeholder={t("institutionFilterLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allInstitutions")}</SelectItem>
            {institutions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoadFinancingRequests")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data && data.requests.length === 0 && (
        <EmptyState icon={Landmark} title={t("noFinancingRequestsMatchFilters")} description={t("tryAdjustingFilters")} />
      )}

      {data && data.requests.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.requests.map((item) => (
              <AdminFinancingRow key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("previous")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("pageOf", { page, totalPages })}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
