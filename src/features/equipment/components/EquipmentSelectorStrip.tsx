"use client";

import { Link } from "@/i18n/navigation";
import { Tractor } from "lucide-react";
import { cn } from "@/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipmentList } from "@/features/equipment/hooks/useEquipment";

export function EquipmentSelectorStrip({ activeId }: { activeId: string }) {
  const { data, isPending } = useEquipmentList();

  if (isPending) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-48 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.equipment.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {data.equipment.map((item) => {
        const isActive = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={`/equipment/${item.id}`}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
              isActive
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Tractor className="size-4" />
            </span>
            <div className="text-start">
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.manufacturer}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
