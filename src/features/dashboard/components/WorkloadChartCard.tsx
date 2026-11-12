import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { WorkloadBarChart } from "@/components/charts/WorkloadBarChart";
import { BarChart3 } from "lucide-react";
import { CARD_TIER_2 } from "@/utils/card-tiers";
import type { DashboardWorkloadDay } from "@/types/dashboard";

export function WorkloadChartCard({ days }: { days: DashboardWorkloadDay[] }) {
  const t = useTranslations("dashboard");
  const hasTasks = days.some((d) => d.tasksScheduled > 0);

  return (
    <Card className={`gap-0 p-5 ${CARD_TIER_2}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-headline text-foreground">{t("workloadTitle")}</h2>
        <span className="text-sm text-muted-foreground">{t("last7Days")}</span>
      </div>
      <div className="mt-4">
        {!hasTasks ? (
          <EmptyState icon={BarChart3} title={t("noTasksScheduled")} description={t("noTasksScheduledDescription")} />
        ) : (
          <WorkloadBarChart days={days} />
        )}
      </div>
    </Card>
  );
}
