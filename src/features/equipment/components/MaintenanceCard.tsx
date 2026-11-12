"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wrench } from "lucide-react";
import { useFormatter, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardState } from "@/components/states/CardState";
import { formatDayLabel } from "@/utils/format";
import { useMaintenance, useCreateMaintenance } from "@/features/equipment/hooks/useMaintenance";
import { useErrorReport } from "@/hooks/useErrorReport";
import { CARD_TIER_2 } from "@/utils/card-tiers";

const maintenanceSchema = z.object({
  performedAt: z.string().min(1, "Enter the service date"),
  nextDueAt: z.string().optional(),
  cost: z.number().positive().optional(),
  mechanic: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

function LogMaintenanceForm({ equipmentId }: { equipmentId: string }) {
  const { submit, isSubmitting, error } = useCreateMaintenance(equipmentId);
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaintenanceFormValues>({ resolver: zodResolver(maintenanceSchema) });

  async function onSubmit(values: MaintenanceFormValues) {
    const ok = await submit({
      performedAt: values.performedAt,
      nextDueAt: values.nextDueAt || undefined,
      cost: values.cost,
      mechanic: values.mechanic,
      notes: values.notes,
    });
    if (ok) {
      reset();
      setIsOpen(false);
    }
  }

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        + Log maintenance
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="performedAt">Service date</Label>
          <Input id="performedAt" type="date" {...register("performedAt")} />
          {errors.performedAt && <p className="text-xs text-destructive">{errors.performedAt.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nextDueAt">Next due (optional)</Label>
          <Input id="nextDueAt" type="date" {...register("nextDueAt")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cost">Cost, MAD (optional)</Label>
          <Input
            id="cost"
            type="number"
            {...register("cost", {
              setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
            })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mechanic">Mechanic (optional)</Label>
          <Input id="mechanic" {...register("mechanic")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" {...register("notes")} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save record"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function MaintenanceCard({
  equipmentId,
  isOwner,
  onErrorChange,
}: {
  equipmentId: string;
  isOwner: boolean;
  onErrorChange?: (isError: boolean) => void;
}) {
  const locale = useLocale();
  const format = useFormatter();
  const { data, isPending, isError, refetch } = useMaintenance(equipmentId);
  useErrorReport(isOwner && isError, onErrorChange);

  if (!isOwner) return null;

  return (
    <Card className={`p-5 ${CARD_TIER_2}`}>
      <div className="flex items-center justify-between">
        <h2 className="type-headline text-foreground">Maintenance history</h2>
        <LogMaintenanceForm equipmentId={equipmentId} />
      </div>

      {isPending && (
        <CardState
          state="loading"
          loadingSkeleton={
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          }
        />
      )}

      {isError && (
        <div className="mt-3">
          <CardState state="error" title="Couldn't load maintenance history" onRetry={() => refetch()} />
        </div>
      )}

      {data && data.records.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">No maintenance logged yet.</p>
      )}

      {data && data.records.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {data.records.map((record) => (
            <div key={record.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Wrench className="size-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{formatDayLabel(record.performedAt, locale)}</p>
                  {record.cost != null && <p className="text-sm font-semibold">{format.number(record.cost)} MAD</p>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {record.mechanic ?? "No mechanic noted"}
                  {record.nextDueAt ? ` · Next due ${formatDayLabel(record.nextDueAt, locale)}` : ""}
                </p>
                {record.notes && <p className="mt-1 text-xs text-muted-foreground">{record.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
