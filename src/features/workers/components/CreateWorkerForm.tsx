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
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarms } from "@/features/farms/hooks/useFarms";
import { useWorkerActions } from "@/features/workers/hooks/useWorkerActions";

interface WorkerFormValues {
  farmId: string;
  fullName: string;
  title: string;
  phone?: string;
}

export function CreateWorkerForm() {
  const t = useTranslations("workers");
  const tTasks = useTranslations("tasks");
  const router = useRouter();
  const { data: farmsData, isPending: farmsPending } = useFarms();
  const { create, pendingId, error } = useWorkerActions();
  const isSubmitting = pendingId === "new";

  const workerSchema = useMemo(
    () =>
      z.object({
        farmId: z.string({ message: tTasks("selectFarm") }).min(1, tTasks("selectFarm")),
        fullName: z.string().min(2, t("nameRequired")),
        title: z.string().min(2, t("roleRequired")),
        phone: z.string().optional(),
      }),
    [t, tTasks]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<WorkerFormValues>({ resolver: zodResolver(workerSchema) });

  async function onSubmit(values: WorkerFormValues) {
    const ok = await create(values.farmId, {
      fullName: values.fullName,
      title: values.title,
      phone: values.phone?.trim() || undefined,
    });
    if (ok) {
      router.push("/workers");
      router.refresh();
    }
  }

  const farms = farmsData?.farms ?? [];

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <h2 className="type-headline text-foreground">{t("detailsTitle")}</h2>

      {farmsPending ? (
        <Skeleton className="mt-4 h-48 rounded-xl" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 flex flex-col gap-5">
          {farms.length !== 1 ? (
            <Field label={tTasks("farm")} htmlFor="farmId" error={errors.farmId?.message}>
              <Controller
                control={control}
                name="farmId"
                defaultValue={farms[0]?.id}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} items={farms.map((f) => ({ value: f.id, label: f.name }))}>
                    <SelectTrigger id="farmId" className="w-full">
                      <SelectValue placeholder={tTasks("selectFarm")} />
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("fullName")} htmlFor="fullName" error={errors.fullName?.message}>
              <Input
                id="fullName"
                autoComplete="name"
                placeholder={t("namePlaceholder")}
                aria-invalid={!!errors.fullName}
                aria-describedby={fieldMessageId("fullName")}
                {...register("fullName")}
              />
            </Field>
            <Field label={t("role")} htmlFor="title" error={errors.title?.message}>
              <Input
                id="title"
                placeholder={t("rolePlaceholder")}
                aria-invalid={!!errors.title}
                aria-describedby={fieldMessageId("title")}
                {...register("title")}
              />
            </Field>
          </div>

          <Field label={t("phone")} htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className="text-start"
              placeholder="+212 6 00 00 00 00"
              {...register("phone")}
            />
          </Field>

          <FormError>{error}</FormError>

          <Button type="submit" size="lg" disabled={isSubmitting} className="sm:w-fit sm:min-w-44">
            {isSubmitting ? t("creatingWorker") : t("addWorkerCta")}
          </Button>
        </form>
      )}
    </Card>
  );
}
