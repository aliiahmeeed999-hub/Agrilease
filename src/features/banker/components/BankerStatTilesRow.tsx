import { Clock, CheckCircle2, XCircle, Landmark } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { StatValue } from "@/components/ui/stat-value";
import type { BankerDashboardSummary } from "@/types/banker";

export function BankerStatTilesRow({ summary }: { summary: BankerDashboardSummary }) {
  const format = useFormatter();
  const t = useTranslations("bankerConsole");

  const tiles = [
    { icon: Clock, label: t("statPending"), value: summary.stats.pendingCount },
    { icon: CheckCircle2, label: t("statApprovedThisMonth"), value: summary.stats.approvedThisMonthCount },
    { icon: XCircle, label: t("statRejectedThisMonth"), value: summary.stats.rejectedThisMonthCount },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className="rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <tile.icon className="size-4" />
            {tile.label}
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            <StatValue value={tile.value} />
          </p>
        </Card>
      ))}
      <Card className="rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Landmark className="size-4" />
          {t("statTotalFinanced")}
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{format.number(summary.stats.totalFinancedMad)} MAD</p>
      </Card>
    </div>
  );
}
