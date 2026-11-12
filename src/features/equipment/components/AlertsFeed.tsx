"use client";

import { Droplets, CheckCircle2, SatelliteDish, Fuel, Wrench, ShieldAlert } from "lucide-react";
import { useFormatter, useNow } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardState } from "@/components/states/CardState";
import { useEquipmentAlerts } from "@/features/equipment/hooks/useEquipment";
import { useErrorReport } from "@/hooks/useErrorReport";
import { CARD_TIER_2 } from "@/utils/card-tiers";
import type { AlertType } from "@/generated/prisma/enums";

const ALERT_ICON: Record<AlertType, typeof Droplets> = {
  HYDRAULIC_PRESSURE_DROP: Droplets,
  SERVICE_COMPLETED: CheckCircle2,
  GPS_SIGNAL_UNSTABLE: SatelliteDish,
  LOW_FUEL: Fuel,
  MAINTENANCE_DUE: Wrench,
};

const SEVERITY_STYLE: Record<string, string> = {
  INFO: "bg-primary/15 text-primary",
  WARNING: "bg-warning/15 text-warning",
  CRITICAL: "bg-destructive/15 text-destructive",
};

export function AlertsFeed({
  equipmentId,
  onErrorChange,
}: {
  equipmentId: string;
  onErrorChange?: (isError: boolean) => void;
}) {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { data, isPending, isError, refetch } = useEquipmentAlerts(equipmentId);
  useErrorReport(isError, onErrorChange);

  return (
    <Card className={`p-5 ${CARD_TIER_2}`}>
      <div className="flex items-center justify-between">
        <h2 className="type-headline text-foreground">Alerts</h2>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isPending && (
          <CardState
            state="loading"
            loadingSkeleton={
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            }
          />
        )}

        {isError && <CardState state="error" title="Couldn't load alerts" onRetry={() => refetch()} />}

        {data && data.alerts.length === 0 && (
          <CardState state="empty" icon={ShieldAlert} title="No alerts" description="This equipment has no recent alerts." />
        )}

        {data?.alerts.map((alert) => {
          const Icon = ALERT_ICON[alert.type] ?? ShieldAlert;
          return (
            <div key={alert.id} className="flex items-start gap-3">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${SEVERITY_STYLE[alert.severity]}`}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  {format.relativeTime(new Date(alert.createdAt), now)}
                  {alert.isResolved && " · resolved"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
