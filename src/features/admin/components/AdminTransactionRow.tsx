import { Tractor, HandCoins } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import type { AdminTransactionListItem } from "@/types/admin";

export function AdminTransactionRow({ item }: { item: AdminTransactionListItem }) {
  const format = useFormatter();
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const Icon = item.type === "RENT" ? Tractor : HandCoins;

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{item.equipment.name}</p>
            <p className="text-xs text-muted-foreground">{item.type === "RENT" ? t("rentalLabel") : t("saleLabel")}</p>
          </div>
        </div>
        <Badge className={STATUS_STYLE[item.status] ?? ""}>{tCommon(`bookingStatus.${item.status}`)}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {t("renterLabel")}: {item.renter.fullName}
        </span>
        <span>
          {t("ownerLabel")}: {item.owner.fullName}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold">{format.number(item.totalPriceMad)} MAD</p>
    </Card>
  );
}
