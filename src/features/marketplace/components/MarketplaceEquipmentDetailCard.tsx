import { Gauge, Weight, Zap, User } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import { EQUIPMENT_CATEGORY_ICON } from "@/utils/equipment-category-style";
import type { MarketplaceEquipmentDetail } from "@/types/marketplace";

function Spec({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="ledger py-2.5 text-sm">
      <Icon className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
      <dt className="text-muted-foreground">{label}</dt>
      <span aria-hidden="true" className="ledger-fill" />
      <dd className="tabular font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Price({ label, amount, currency, suffix }: { label: string; amount: string; currency: string; suffix?: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-3xl leading-tight font-semibold tracking-tight text-foreground">
        {amount} <span className="text-base font-medium text-muted-foreground">{currency}</span>
        {suffix && <span className="text-base font-normal text-muted-foreground"> {suffix}</span>}
      </p>
    </div>
  );
}

export function MarketplaceEquipmentDetailCard({ equipment }: { equipment: MarketplaceEquipmentDetail }) {
  const format = useFormatter();
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const tCondition = useTranslations("common.condition");
  const tStatus = useTranslations("common.equipmentStatus");

  const CategoryIcon = EQUIPMENT_CATEGORY_ICON[equipment.category];
  const isRentable = equipment.listingType === "RENT" || equipment.listingType === "RENT_AND_SALE";
  const isSellable = equipment.listingType === "SALE" || equipment.listingType === "RENT_AND_SALE";

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <CategoryIcon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="type-title-2 text-foreground">{equipment.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
            {equipment.manufacturer} {equipment.model}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge className={STATUS_STYLE[equipment.status] ?? ""}>{tStatus(equipment.status)}</Badge>
        {isRentable && <Badge variant="neutral">{t("tabForRent")}</Badge>}
        {isSellable && <Badge variant="neutral">{t("tabForSale")}</Badge>}
        <Badge variant="outline">{tCondition(equipment.condition)}</Badge>
        {isSellable && equipment.negotiable && <Badge variant="outline">{t("negotiableTag")}</Badge>}
      </div>

      {/* The price is the first thing a buyer or renter looks for, so it sits
          directly under the name in the largest type on the page. */}
      <div className="mt-6 grid gap-5 border-y border-border py-5 sm:grid-cols-2">
        {isRentable && (
          <Price
            label={t("dailyRateLabel")}
            amount={format.number(equipment.dailyRateMad ?? 0)}
            currency={tCommon("currencyMad")}
            suffix={t("perDay")}
          />
        )}
        {isSellable && (
          <Price
            label={t("salePriceLabel")}
            amount={format.number(equipment.salePrice ?? 0)}
            currency={tCommon("currencyMad")}
          />
        )}
      </div>

      <h2 className="type-overline mt-6 text-muted-foreground">{t("specifications")}</h2>
      <dl className="mt-1">
        <Spec icon={Zap} label={t("enginePower")} value={`${format.number(equipment.enginePowerHp)} ${t("hp")}`} />
        <Spec icon={Weight} label={t("hitchCapacity")} value={`${format.number(equipment.hitchCapacityKg)} ${t("kg")}`} />
        <Spec icon={Gauge} label={t("maxSpeed")} value={`${format.number(equipment.maxSpeedKmh)} ${t("kmh")}`} />
      </dl>

      <h2 className="type-overline mt-6 text-muted-foreground">{t("ownerLabel")}</h2>
      <div className="mt-2 flex items-center gap-3 rounded-xl bg-muted/50 p-3.5 text-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{equipment.owner.fullName}</p>
          <p className="text-muted-foreground">
            {equipment.owner.region ?? t("regionFallback")}
            {equipment.owner.phone && (
              <>
                {" · "}
                <a href={`tel:${equipment.owner.phone}`} dir="ltr" className="font-medium text-foreground underline-offset-4 hover:underline">
                  {equipment.owner.phone}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
