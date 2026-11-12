import { Landmark, User } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FINANCING_STATUS_STYLE } from "@/utils/status-style";
import { financingRequestEquipmentLabel } from "@/utils/financing-request-display";
import type { FinancingRequestListItem } from "@/types/banker";

export function ApprovedLoanRow({ loan }: { loan: FinancingRequestListItem }) {
  const format = useFormatter();
  const t = useTranslations("bankerConsole");
  const tCommon = useTranslations("common");

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Landmark className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{financingRequestEquipmentLabel(loan)}</p>
            <p className="text-xs text-muted-foreground">
              {t("financedAmount", { amount: format.number(loan.requestedAmountMad) })}
            </p>
          </div>
        </div>
        <Badge className={FINANCING_STATUS_STYLE[loan.status]}>{tCommon(`financingStatus.${loan.status}`)}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <User className="size-3.5" />
        <span>{loan.farmer.fullName}</span>
        {loan.farmer.phone && <span>· {loan.farmer.phone}</span>}
      </div>
    </Card>
  );
}
