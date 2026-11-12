import { Tractor } from "lucide-react";
import { useFormatter } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import { CARD_TIER_1 } from "@/utils/card-tiers";
import type { EquipmentDetail } from "@/types/equipment";

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function EquipmentInfoCard({ equipment }: { equipment: EquipmentDetail }) {
  const format = useFormatter();
  return (
    <Card className={`overflow-hidden p-0 ${CARD_TIER_1}`}>
      <div className="flex h-40 items-center justify-center bg-muted">
        <Tractor className="size-16 text-muted-foreground/40" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{equipment.name}</h1>
          <Badge className={STATUS_STYLE[equipment.status] ?? ""}>{equipment.status.toLowerCase()}</Badge>
        </div>
        {equipment.currentFarm && (
          <p className="mt-0.5 text-sm text-muted-foreground">at {equipment.currentFarm.name}</p>
        )}

        <div className="mt-3">
          <Spec label="Model / type" value={`${equipment.manufacturer} ${equipment.model}`} />
          <Spec label="Engine power" value={`${equipment.enginePowerHp} hp`} />
          <Spec label="Hitch capacity" value={`${format.number(equipment.hitchCapacityKg)} kg`} />
          <Spec label="Max speed" value={`${equipment.maxSpeedKmh} km/h`} />
          {equipment.purchaseYear && <Spec label="In service since" value={`${equipment.purchaseYear}`} />}
        </div>
      </div>
    </Card>
  );
}
