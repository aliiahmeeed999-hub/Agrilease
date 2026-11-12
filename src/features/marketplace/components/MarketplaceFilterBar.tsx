"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EQUIPMENT_CATEGORY_ORDER } from "@/lib/marketplace";
import type { MarketplaceFilters } from "@/services/marketplace.service";
import type { MarketplaceListingTypeFilter, MarketplaceSort } from "@/types/marketplace";
import type { EquipmentCategory, Condition } from "@/generated/prisma/enums";

type TabValue = "ALL" | "RENT" | "SALE";

export function MarketplaceFilterBar() {
  const t = useTranslations("marketplace");
  const tCategory = useTranslations("common.equipmentCategory");
  const tCondition = useTranslations("common.condition");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);

  const listingTypeFilter = (searchParams.get("listingTypeFilter") as MarketplaceListingTypeFilter | null) ?? undefined;
  const category = (searchParams.get("category") as EquipmentCategory | null) ?? undefined;
  const condition = (searchParams.get("condition") as Condition | null) ?? undefined;
  const sort = (searchParams.get("sort") as MarketplaceSort | null) ?? undefined;
  const tab: TabValue = listingTypeFilter ?? "ALL";

  interface FilterUpdate {
    listingTypeFilter?: MarketplaceListingTypeFilter | "ALL";
    category?: MarketplaceFilters["category"];
    condition?: MarketplaceFilters["condition"];
    sort?: MarketplaceSort;
  }

  function applyFilters(next: Partial<FilterUpdate>) {
    const merged: FilterUpdate = {
      listingTypeFilter: next.listingTypeFilter !== undefined ? next.listingTypeFilter : listingTypeFilter,
      category: next.category !== undefined ? next.category : category,
      condition: next.condition !== undefined ? next.condition : condition,
      sort: next.sort !== undefined ? next.sort : sort,
    };
    const query: Record<string, string> = {};
    if (merged.listingTypeFilter && merged.listingTypeFilter !== "ALL") query.listingTypeFilter = merged.listingTypeFilter;
    if (merged.category) query.category = merged.category;
    if (merged.condition) query.condition = merged.condition;
    if (merged.sort) query.sort = merged.sort;
    router.replace({ pathname, query });
  }

  const hasExtraFilters = Boolean(category || condition || sort);

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => applyFilters({ listingTypeFilter: v as TabValue })}>
          <TabsList>
            <TabsTrigger value="ALL">{t("tabAll")}</TabsTrigger>
            <TabsTrigger value="RENT">{t("tabForRent")}</TabsTrigger>
            <TabsTrigger value="SALE">{t("tabForSale")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          className="sm:hidden"
          aria-expanded={expanded}
          aria-controls="marketplace-filters"
          onClick={() => setExpanded((v) => !v)}
        >
          <SlidersHorizontal aria-hidden="true" />
          {t("filtersButton")}
          {hasExtraFilters && <span className="size-2 rounded-full bg-primary" aria-hidden="true" />}
        </Button>
      </div>

      <div
        id="marketplace-filters"
        className={`flex-col gap-3 sm:flex sm:flex-row sm:items-center ${expanded ? "flex" : "hidden"}`}
      >
        <Select value={category ?? "ALL"} onValueChange={(v) => applyFilters({ category: v === "ALL" ? undefined : (v as MarketplaceFilters["category"]) })}>
          <SelectTrigger aria-label={t("categoryLabel")} className="w-full sm:w-52">
            <SelectValue placeholder={t("categoryLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("categoryAll")}</SelectItem>
            {EQUIPMENT_CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {tCategory(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={condition ?? "ANY"} onValueChange={(v) => applyFilters({ condition: v === "ANY" ? undefined : (v as MarketplaceFilters["condition"]) })}>
          <SelectTrigger aria-label={t("conditionLabel")} className="w-full sm:w-44">
            <SelectValue placeholder={t("conditionLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">{t("conditionAny")}</SelectItem>
            <SelectItem value="NEW">{tCondition("NEW")}</SelectItem>
            <SelectItem value="USED">{tCondition("USED")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort ?? "newest"} onValueChange={(v) => applyFilters({ sort: v as MarketplaceSort })}>
          <SelectTrigger aria-label={t("sortLabel")} className="w-full sm:w-52">
            <SelectValue placeholder={t("sortLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
            <SelectItem value="type_az">{t("sortTypeAz")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
