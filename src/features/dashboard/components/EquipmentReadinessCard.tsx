import { Link } from "@/i18n/navigation";
import { Tractor, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { EQUIPMENT_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import { CARD_TIER_2, CARD_TIER_3 } from "@/utils/card-tiers";
import type { DashboardEquipmentReadiness } from "@/types/dashboard";

export function EquipmentReadinessCard({ equipment }: { equipment: DashboardEquipmentReadiness[] }) {
  const t = useTranslations("dashboard");
  const tStatus = useTranslations("common.equipmentStatus");

  return (
    <Card className={`gap-0 p-5 ${CARD_TIER_2}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-headline text-foreground">{t("equipmentReadiness")}</h2>
        <span className="tabular text-sm text-muted-foreground">
          {t("equipmentActiveCount", { active: equipment.filter((e) => e.status === "ACTIVE").length, total: equipment.length })}
        </span>
      </div>

      {equipment.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Tractor} title={t("noEquipmentYet")} description={t("noEquipmentDescription")} />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {equipment.map((item) => (
            <li key={item.id}>
              <Link
                href={`/equipment/${item.id}`}
                className={`group flex flex-col gap-2 p-3 ring-1 ring-border transition-colors hover:bg-card hover:ring-foreground/25 ${CARD_TIER_3}`}
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
                    {t("equipmentMeta", { done: item.tasksCompleted, total: item.tasksTotal, km: item.distanceKmThisWeek })}
                  </span>
                  {item.activeAlertsCount > 0 && (
                    <span className="flex items-center gap-1 font-medium text-destructive">
                      <AlertTriangle className="size-4" aria-hidden="true" />
                      {t("activeAlerts", { count: item.activeAlertsCount })}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
