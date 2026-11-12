import { Tractor, Tag, ClipboardList, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { StatValue } from "@/components/ui/stat-value";
import { cn } from "@/utils/cn";
import type { OwnerDashboardSummary } from "@/types/owner";

export function OwnerStatTilesRow({ stats }: { stats: OwnerDashboardSummary["stats"] }) {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const needsReview = stats.pendingBookingsCount > 0;

  const tiles = [
    {
      icon: Tractor,
      label: t("statFleet"),
      value: stats.fleetTotal,
      hint: t("statFleetHint", { active: stats.fleetActive, maintenance: stats.fleetMaintenance }),
    },
    {
      icon: Tag,
      label: t("statListed"),
      value: stats.listedCount,
      hint: t("statListedHint", { total: stats.fleetTotal }),
    },
    {
      icon: ClipboardList,
      label: t("statPending"),
      value: stats.pendingBookingsCount,
      hint: needsReview ? t("statPendingNeedsReview") : t("statPendingClear"),
      highlight: needsReview,
    },
    {
      icon: Wallet,
      label: t("statApprovedValue"),
      value: stats.approvedBookingsValueMad,
      unit: tCommon("currencyMad"),
      hint: t("statApprovedValueHint"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        // A tile that needs action gets the attention colour and its hint
        // says so in words; colour is never the only signal.
        <Card key={tile.label} className={cn("gap-0 p-5", tile.highlight && "ring-warning/50 bg-warning/5")}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <tile.icon className="size-4 shrink-0" aria-hidden="true" />
            {tile.label}
          </div>
          <p className="tabular mt-2 flex items-baseline gap-1.5 text-2xl leading-tight font-semibold tracking-tight text-foreground">
            <StatValue value={tile.value} />
            {tile.unit && <span className="text-sm font-medium text-muted-foreground">{tile.unit}</span>}
          </p>
          <p className={cn("mt-1 text-sm", tile.highlight ? "font-medium text-warning" : "text-muted-foreground")}>{tile.hint}</p>
        </Card>
      ))}
    </div>
  );
}
