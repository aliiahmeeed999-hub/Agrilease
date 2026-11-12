import { Users, Tractor, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { CARD_TIER_2 } from "@/utils/card-tiers";
import type { DashboardSummary } from "@/types/dashboard";

export function StatTilesRow({ stats }: { stats: DashboardSummary["stats"] }) {
  const t = useTranslations("dashboard");

  const tiles = [
    {
      icon: Users,
      label: t("workforceOnDuty"),
      value: t("workersCountValue", { count: stats.workersOnDuty }),
      hint: t("ofTotalWorkers", { total: stats.totalWorkers }),
    },
    {
      icon: Tractor,
      label: t("equipmentAvailability"),
      value: t("equipmentCountValue", { active: stats.equipmentActive, total: stats.equipmentTotal }),
      hint: t("currentlyActive"),
    },
    {
      icon: ListChecks,
      label: t("tasksThisWeek"),
      value: t("tasksDoneValue", { done: stats.tasksCompletedThisWeek, total: stats.tasksTotalThisWeek }),
      hint: t("fieldsAndArea", { fields: stats.totalFields, area: stats.totalAreaHectares }),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label} className={`gap-0 p-5 ${CARD_TIER_2}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <tile.icon className="size-4 shrink-0" aria-hidden="true" />
            {tile.label}
          </div>
          <p className="tabular mt-2 text-2xl leading-tight font-semibold tracking-tight text-foreground">{tile.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tile.hint}</p>
        </Card>
      ))}
    </div>
  );
}
