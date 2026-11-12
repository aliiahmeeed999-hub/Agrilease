"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createField, updateField } from "@/services/farm.service";
import { ApiError } from "@/services/api-client";
import type { FarmFieldItem } from "@/types/farm";

const CROPS = ["WHEAT", "BARLEY", "OLIVES", "CITRUS", "VEGETABLES", "OTHER"] as const;
const STATUSES = ["GROWING", "HARVESTED", "FALLOW"] as const;
const SOILS = ["CLAY", "SANDY", "LOAM", "SILT", "CHALKY", "PEAT"] as const;
const IRRIGATION = ["DRIP", "SPRINKLER", "FLOOD", "RAINFED", "NONE"] as const;

interface FieldFormValues {
  name: string;
  cropType: (typeof CROPS)[number];
  areaHectares: number;
  centerLat: number;
  centerLng: number;
  status: (typeof STATUSES)[number];
  soilType?: (typeof SOILS)[number];
  irrigationMethod?: (typeof IRRIGATION)[number];
  plantedAt?: string;
  expectedHarvestAt?: string;
}

interface FieldFormProps {
  farmId: string;
  field?: FarmFieldItem;
  defaultCenterLat: number;
  defaultCenterLng: number;
  onSaved: () => void;
  onCancel?: () => void;
}

export function FieldForm({ farmId, field, defaultCenterLat, defaultCenterLng, onSaved, onCancel }: FieldFormProps) {
  const t = useTranslations("fields");
  const tFarms = useTranslations("farms");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ids must be unique per form: several fields can be open for editing at once.
  const idp = field ? `f-${field.id}` : "f-new";

  const fieldSchema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, t("nameRequired")),
          cropType: z.enum(CROPS, { message: t("cropRequired") }),
          areaHectares: z.number({ message: t("areaRequired") }).positive(t("areaRequired")),
          centerLat: z.number({ message: tFarms("coordinatesRequired") }).min(-90).max(90),
          centerLng: z.number({ message: tFarms("coordinatesRequired") }).min(-180).max(180),
          status: z.enum(STATUSES),
          soilType: z.enum(SOILS).optional(),
          irrigationMethod: z.enum(IRRIGATION).optional(),
          plantedAt: z.string().optional(),
          expectedHarvestAt: z.string().optional(),
        })
        .refine((data) => !data.plantedAt || !data.expectedHarvestAt || data.plantedAt < data.expectedHarvestAt, {
          message: t("harvestDateError"),
          path: ["expectedHarvestAt"],
        }),
    [t, tFarms]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FieldFormValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: field
      ? {
          name: field.name,
          cropType: field.cropType,
          areaHectares: field.areaHectares,
          centerLat: field.centerLat,
          centerLng: field.centerLng,
          status: field.status,
          soilType: field.soilType ?? undefined,
          irrigationMethod: field.irrigationMethod ?? undefined,
          plantedAt: field.plantedAt?.slice(0, 10),
          expectedHarvestAt: field.expectedHarvestAt?.slice(0, 10),
        }
      : {
          centerLat: defaultCenterLat,
          centerLng: defaultCenterLng,
          status: "GROWING",
        },
  });

  async function onSubmit(values: FieldFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      if (field) {
        await updateField(field.id, values);
      } else {
        await createField(farmId, values);
      }
      await queryClient.invalidateQueries({ queryKey: ["farms", "detail", farmId] });
      onSaved();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function enumSelect(
    name: "cropType" | "status" | "soilType" | "irrigationMethod",
    label: string,
    values: readonly string[],
    ns: "crop" | "fieldStatus" | "soilType" | "irrigationType"
  ) {
    const id = `${idp}-${name}`;
    return (
      <Field label={label} htmlFor={id} error={errors[name]?.message}>
        <Controller
          control={control}
          name={name}
          render={({ field: f }) => (
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger id={id} className="w-full" aria-invalid={!!errors[name]}>
                <SelectValue placeholder={tCommon("select")}>
                  {(v: string | null) => (v ? tCommon(`${ns}.${v}`) : tCommon("select"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {tCommon(`${ns}.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("fieldName")} htmlFor={`${idp}-name`} error={errors.name?.message}>
          <Input
            id={`${idp}-name`}
            aria-invalid={!!errors.name}
            aria-describedby={fieldMessageId(`${idp}-name`)}
            {...register("name")}
          />
        </Field>
        {enumSelect("cropType", t("cropType"), CROPS, "crop")}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        <Field label={t("areaHectares")} htmlFor={`${idp}-area`} error={errors.areaHectares?.message} className="col-span-2 sm:col-span-1">
          <Input
            id={`${idp}-area`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            aria-invalid={!!errors.areaHectares}
            aria-describedby={fieldMessageId(`${idp}-area`)}
            {...register("areaHectares", { valueAsNumber: true })}
          />
        </Field>
        <Field label={tFarms("latitude")} htmlFor={`${idp}-lat`} error={errors.centerLat?.message}>
          <Input id={`${idp}-lat`} type="number" inputMode="decimal" step="0.0001" dir="ltr" {...register("centerLat", { valueAsNumber: true })} />
        </Field>
        <Field label={tFarms("longitude")} htmlFor={`${idp}-lng`} error={errors.centerLng?.message}>
          <Input id={`${idp}-lng`} type="number" inputMode="decimal" step="0.0001" dir="ltr" {...register("centerLng", { valueAsNumber: true })} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {enumSelect("status", t("status"), STATUSES, "fieldStatus")}
        {enumSelect("soilType", tFarms("soilTypeLabel"), SOILS, "soilType")}
        {enumSelect("irrigationMethod", t("irrigation"), IRRIGATION, "irrigationType")}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("plantedAt")} htmlFor={`${idp}-planted`}>
          <Input id={`${idp}-planted`} type="date" {...register("plantedAt")} />
        </Field>
        <Field label={t("expectedHarvestAt")} htmlFor={`${idp}-harvest`} error={errors.expectedHarvestAt?.message}>
          <Input
            id={`${idp}-harvest`}
            type="date"
            aria-invalid={!!errors.expectedHarvestAt}
            aria-describedby={fieldMessageId(`${idp}-harvest`)}
            {...register("expectedHarvestAt")}
          />
        </Field>
      </div>

      <FormError>{serverError}</FormError>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tCommon("saving") : field ? tCommon("saveChanges") : t("addField")}
        </Button>
      </div>
    </form>
  );
}
