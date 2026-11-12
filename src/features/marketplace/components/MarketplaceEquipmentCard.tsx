import { Link } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EQUIPMENT_CATEGORY_ICON } from "@/utils/equipment-category-style";
import { cn } from "@/utils/cn";
import type { MarketplaceEquipmentListItem } from "@/types/marketplace";

export function MarketplaceEquipmentCard({
  item,
  // Hidden when the card already sits under a heading that names its category.
  showCategory = true,
}: {
  item: MarketplaceEquipmentListItem;
  showCategory?: boolean;
}) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const tCategory = useTranslations("common.equipmentCategory");
  const tCondition = useTranslations("common.condition");
  const format = useFormatter();

  const CategoryIcon = EQUIPMENT_CATEGORY_ICON[item.category];
  const isRentable = item.listingType === "RENT" || item.listingType === "RENT_AND_SALE";
  const isSellable = item.listingType === "SALE" || item.listingType === "RENT_AND_SALE";

  return (
    // The whole card is one target: the title link stretches over it, so a
    // tap anywhere opens the listing. "Simulate financing" sits above that
    // layer as the only separate action.
    <Card className="relative flex h-full flex-col gap-0 p-5 transition-shadow duration-150 hover:ring-foreground/25 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <CategoryIcon className="size-5.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="type-headline text-foreground">
            <Link href={`/marketplace/${item.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
              {item.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span dir="ltr">
              {item.manufacturer} {item.model}
            </span>{" "}
            · {item.enginePowerHp} {t("hp")}
          </p>
          {showCategory && <p className="text-sm text-muted-foreground">{tCategory(item.category)}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {isRentable && <Badge variant="neutral">{t("tabForRent")}</Badge>}
        {isSellable && <Badge variant="neutral">{t("tabForSale")}</Badge>}
        <Badge variant="outline">{tCondition(item.condition)}</Badge>
        {isSellable && item.negotiable && <Badge variant="outline">{t("negotiableTag")}</Badge>}
      </div>

      <div className="mt-auto pt-5">
        {isRentable && (
          <p className="tabular text-lg leading-tight font-semibold text-foreground">
            {format.number(item.dailyRateMad ?? 0)} {tCommon("currencyMad")}
            <span className="text-sm font-normal text-muted-foreground"> {t("perDay")}</span>
          </p>
        )}
        {isSellable && (
          <p
            className={cn(
              "tabular",
              isRentable ? "mt-0.5 text-sm text-muted-foreground" : "text-lg leading-tight font-semibold text-foreground"
            )}
          >
            {isRentable && `${t("tabForSale")} · `}
            {format.number(item.salePrice ?? 0)} {tCommon("currencyMad")}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-4">
        <p className="min-w-0 truncate text-sm text-muted-foreground">{t("listedBy", { name: item.owner.fullName })}</p>
        {isSellable && (
          <Link
            href={{
              pathname: "/financing/simulate",
              query: { equipmentId: item.id, equipmentName: item.name, price: String(item.salePrice ?? 0), qty: "1" },
            }}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "relative z-10 shrink-0")}
          >
            {t("simulateFinancing")}
          </Link>
        )}
      </div>
    </Card>
  );
}
