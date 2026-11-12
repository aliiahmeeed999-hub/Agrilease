import { Link } from "@/i18n/navigation";
import { AlertTriangle, Tractor } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { EQUIPMENT_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import type { OwnerFleetItem } from "@/types/owner";

export function OwnerFleetList({ equipment }: { equipment: OwnerFleetItem[] }) {
  const t = useTranslations("ownerConsole");
  const tStatus = useTranslations("common.equipmentStatus");
  const format = useFormatter();
  return (
    <Card className="gap-0 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-headline text-foreground">{t("yourFleet")}</h2>
        <span className="tabular text-sm text-muted-foreground">{t("unitsCount", { count: equipment.length })}</span>
      </div>

      {equipment.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Tractor} title={t("noEquipmentYet")} description={t("noEquipmentDescription")} />
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {equipment.map((item) => (
            <li key={item.id}>
              <Link
                href={`/equipment/${item.id}`}
                className="group flex h-full flex-col gap-2 rounded-xl border border-border p-3.5 transition-colors hover:border-foreground/25 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="truncate text-sm text-muted-foreground" dir="ltr">
                      {item.manufacturer} {item.model}
                    </p>
                  </div>
                  <Badge className={STATUS_STYLE[item.status] ?? ""}>{tStatus(item.status)}</Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="tabular">
                    {item.dailyRateMad != null ? t("ratePerDay", { amount: format.number(item.dailyRateMad) }) : t("noRateSet")}
                  </span>
                  <Badge variant={item.isListed ? "success" : "neutral"}>{item.isListed ? t("listedStatus") : t("unlistedStatus")}</Badge>
                </div>
                {item.isFlagged && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-sm text-destructive">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                    {t("flaggedHidden")}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
