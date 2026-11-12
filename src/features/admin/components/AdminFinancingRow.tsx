import { Landmark } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FINANCING_STATUS_STYLE } from "@/utils/status-style";
import { financingRequestEquipmentLabel } from "@/utils/financing-request-display";
import type { AdminFinancingRequestListItem } from "@/types/admin";

export function AdminFinancingRow({ item }: { item: AdminFinancingRequestListItem }) {
  const format = useFormatter();
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const tCategory = useTranslations("common.equipmentCategory");

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Landmark className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{financingRequestEquipmentLabel(item) ?? t("financingNoEquipment")}</p>
            <p className="text-xs text-muted-foreground">{format.number(item.requestedAmountMad)} MAD</p>
          </div>
        </div>
        <Badge className={FINANCING_STATUS_STYLE[item.status]}>{tCommon(`financingStatus.${item.status}`)}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{item.farmer.fullName}</span>
        {item.region && <span>{item.region}</span>}
        {item.primaryEquipmentCategory && <span>{tCategory(item.primaryEquipmentCategory)}</span>}
        {item.chosenOfferInstitution && <span>{item.chosenOfferInstitution}</span>}
      </div>
    </Card>
  );
}
