"use client";

import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarms } from "@/features/farms/hooks/useFarms";
import { useFarm } from "@/features/farms/hooks/useFarm";
import { useWorkers } from "@/features/workers/hooks/useWorkers";
import { useTaskActions } from "@/features/tasks/hooks/useTaskActions";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

interface TaskFormValues {
  farmId: string;
  title: string;
  description?: string;
  fieldId?: string;
  workerId?: string;
  dueDate: string;
  priority?: (typeof PRIORITIES)[number];
}

export function CreateTaskForm() {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data: farmsData, isPending: farmsPending } = useFarms();
  const { create, pendingId, error } = useTaskActions();
  const isSubmitting = pendingId === "new";

  const taskSchema = useMemo(
    () =>
      z.object({
        farmId: z.string({ message: t("selectFarm") }).min(1, t("selectFarm")),
        title: z.string().min(2, t("titleRequired")),
        description: z.string().optional(),
        fieldId: z.string().optional(),
        workerId: z.string().optional(),
        dueDate: z.string({ message: t("dueDateRequired") }).min(1, t("dueDateRequired")),
        priority: z.enum(PRIORITIES).optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema) });

  const farms = farmsData?.farms ?? [];
  const selectedFarmId = watch("farmId") ?? farms[0]?.id;

  // Fields come from the selected farm's own detail (already loaded elsewhere via useFarm);
  // workers are farm-scoped too, so both selectors narrow once a farm is picked.
  const { data: farmDetail } = useFarm(selectedFarmId ?? "");
  const { data: workersData } = useWorkers();
  const farmWorkers = (workersData?.workers ?? []).filter((w) => w.farmId === selectedFarmId);
  const farmFields = farmDetail?.fields ?? [];

  async function onSubmit(values: TaskFormValues) {
    const ok = await create(values.farmId, {
      title: values.title,
      description: values.description?.trim() || undefined,
      fieldId: values.fieldId || undefined,
      workerId: values.workerId || undefined,
      dueDate: values.dueDate,
      priority: values.priority,
    });
    if (ok) {
      router.push("/tasks");
      router.refresh();
    }
  }

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <h2 className="type-headline text-foreground">{t("detailsTitle")}</h2>

      {farmsPending ? (
        <Skeleton className="mt-4 h-72 rounded-xl" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 flex flex-col gap-5">
          {/* With one farm there is nothing to choose, so the picker is hidden. */}
          {farms.length !== 1 ? (
            <Field label={t("farm")} htmlFor="farmId" error={errors.farmId?.message}>
              <Controller
                control={control}
                name="farmId"
                defaultValue={farms[0]?.id}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} items={farms.map((f) => ({ value: f.id, label: f.name }))}>
                    <SelectTrigger id="farmId" className="w-full">
                      <SelectValue placeholder={t("selectFarm")} />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ) : (
            <Controller control={control} name="farmId" defaultValue={farms[0]?.id} render={() => <></>} />
          )}

          <Field label={t("taskTitle")} htmlFor="title" error={errors.title?.message}>
            <Input
              id="title"
              placeholder={t("titlePlaceholder")}
              aria-invalid={!!errors.title}
              aria-describedby={fieldMessageId("title")}
              {...register("title")}
            />
          </Field>

          <Field label={t("description")} htmlFor="description">
            <Textarea id="description" {...register("description")} />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("dueDate")} htmlFor="dueDate" error={errors.dueDate?.message}>
              <Input
                id="dueDate"
                type="date"
                aria-invalid={!!errors.dueDate}
                aria-describedby={fieldMessageId("dueDate")}
                {...register("dueDate")}
              />
            </Field>
            <Field label={t("priority")} htmlFor="priority">
              <Controller
                control={control}
                name="priority"
                defaultValue="MEDIUM"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={PRIORITIES.map((p) => ({ value: p, label: tCommon(`taskPriority.${p}`) }))}
                  >
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {tCommon(`taskPriority.${p}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("field")} htmlFor="fieldId">
              <Controller
                control={control}
                name="fieldId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} items={farmFields.map((f) => ({ value: f.id, label: f.name }))}>
                    <SelectTrigger id="fieldId" className="w-full">
                      <SelectValue placeholder={t("noField")} />
                    </SelectTrigger>
                    <SelectContent>
                      {farmFields.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label={t("worker")} htmlFor="workerId">
              <Controller
                control={control}
                name="workerId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} items={farmWorkers.map((w) => ({ value: w.id, label: w.fullName }))}>
                    <SelectTrigger id="workerId" className="w-full">
                      <SelectValue placeholder={t("unassigned")} />
                    </SelectTrigger>
                    <SelectContent>
                      {farmWorkers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <FormError>{error}</FormError>

          <Button type="submit" size="lg" disabled={isSubmitting} className="sm:w-fit sm:min-w-44">
            {isSubmitting ? t("creatingTask") : t("addTaskCta")}
          </Button>
        </form>
      )}
    </Card>
  );
}
