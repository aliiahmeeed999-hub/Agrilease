import { Users, Tractor, ClipboardList, Sprout } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { StatValue } from "@/components/ui/stat-value";
import type { AdminAnalyticsSummary } from "@/types/admin";

export function AdminStatTilesRow({ summary }: { summary: AdminAnalyticsSummary }) {
  const t = useTranslations("adminConsole");
  const cropTypeCount = Object.values(summary.fields.byCropType).filter((n) => n > 0).length;

  const tiles = [
    {
      icon: Users,
      label: t("users"),
      value: summary.users.total,
      hint: t("statSuspended", { count: summary.users.suspended }),
      highlight: summary.users.suspended > 0,
    },
    {
      icon: Tractor,
      label: t("equipment"),
      value: summary.equipment.total,
      hint: t("statFlagged", { count: summary.equipment.flagged }),
      highlight: summary.equipment.flagged > 0,
    },
    {
      icon: ClipboardList,
      label: t("statBookings"),
      value: summary.bookings.total,
      hint: t("statPending", { count: summary.bookings.byStatus.PENDING }),
      highlight: summary.bookings.byStatus.PENDING > 0,
    },
    {
      icon: Sprout,
      label: t("statFarmsFields"),
      value: summary.farms.total,
      hint: t("statFarmsHint", { fields: summary.fields.total, crops: cropTypeCount }),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className={cn("gap-0 p-5", tile.highlight && "bg-warning/5 ring-warning/50")}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <tile.icon className="size-4 shrink-0" aria-hidden="true" />
            {tile.label}
          </div>
          <p className="tabular mt-2 text-2xl leading-tight font-semibold tracking-tight text-foreground">
            <StatValue value={tile.value} />
          </p>
          <p className={cn("mt-1 text-sm", tile.highlight ? "font-medium text-warning" : "text-muted-foreground")}>{tile.hint}</p>
        </Card>
      ))}
    </div>
  );
}
