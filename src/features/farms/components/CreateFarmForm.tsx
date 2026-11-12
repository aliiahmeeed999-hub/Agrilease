"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFarm } from "@/services/farm.service";
import { ApiError } from "@/services/api-client";

const IRRIGATION = ["DRIP", "SPRINKLER", "FLOOD", "RAINFED", "NONE"] as const;
const WATER_SOURCES = ["WELL", "RIVER", "RESERVOIR", "MUNICIPAL", "RAINWATER"] as const;
const SOILS = ["CLAY", "SANDY", "LOAM", "SILT", "CHALKY", "PEAT"] as const;

interface FarmFormValues {
  name: string;
  region: string;
  province?: string;
  sizeHectares: number;
  latitude: number;
  longitude: number;
  elevation?: number;
  irrigationType?: (typeof IRRIGATION)[number];
  waterSource?: (typeof WATER_SOURCES)[number];
  soilType?: (typeof SOILS)[number];
  imageUrl?: string;
}

export function CreateFarmForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same rules as before; built here so the messages are translated.
  const farmSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t("nameRequired")),
        region: z.string().min(2, t("regionRequired")),
        province: z.string().optional(),
        sizeHectares: z.number({ message: t("sizeRequired") }).positive(t("sizeRequired")),
        latitude: z.number({ message: t("coordinatesRequired") }).min(-90, t("coordinatesRequired")).max(90, t("coordinatesRequired")),
        longitude: z.number({ message: t("coordinatesRequired") }).min(-180, t("coordinatesRequired")).max(180, t("coordinatesRequired")),
        elevation: z.number().optional(),
        irrigationType: z.enum(IRRIGATION).optional(),
        waterSource: z.enum(WATER_SOURCES).optional(),
        soilType: z.enum(SOILS).optional(),
        imageUrl: z.string().optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FarmFormValues>({ resolver: zodResolver(farmSchema) });

  async function onSubmit(values: FarmFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const farm = await createFarm(values);
      await queryClient.invalidateQueries({ queryKey: ["farms", "list"] });
      router.push(redirectTo ?? `/farms/${farm.id}`);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const invalid = (name: keyof FarmFormValues) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": fieldMessageId(name),
  });

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-5">
          <legend className="type-headline mb-4 text-foreground">{t("farmDetails")}</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("farmName")} htmlFor="name" error={errors.name?.message}>
              <Input id="name" placeholder={t("namePlaceholder")} {...invalid("name")} {...register("name")} />
            </Field>
            <Field label={t("sizeHectares")} htmlFor="sizeHectares" error={errors.sizeHectares?.message}>
              <Input
                id="sizeHectares"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                {...invalid("sizeHectares")}
                {...register("sizeHectares", { valueAsNumber: true })}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="type-headline mb-4 text-foreground">{t("sectionLocation")}</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("region")} htmlFor="region" error={errors.region?.message}>
              <Input id="region" placeholder={t("regionPlaceholder")} {...invalid("region")} {...register("region")} />
            </Field>
            <Field label={t("province")} htmlFor="province">
              <Input id="province" {...register("province")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
            <Field label={t("latitude")} htmlFor="latitude" error={errors.latitude?.message}>
              <Input
                id="latitude"
                type="number"
                inputMode="decimal"
                step="0.0001"
                dir="ltr"
                {...invalid("latitude")}
                {...register("latitude", { valueAsNumber: true })}
              />
            </Field>
            <Field label={t("longitude")} htmlFor="longitude" error={errors.longitude?.message}>
              <Input
                id="longitude"
                type="number"
                inputMode="decimal"
                step="0.0001"
                dir="ltr"
                {...invalid("longitude")}
                {...register("longitude", { valueAsNumber: true })}
              />
            </Field>
            <Field label={t("elevation")} htmlFor="elevation" className="col-span-2 sm:col-span-1">
              <Input
                id="elevation"
                type="number"
                inputMode="numeric"
                {...register("elevation", {
                  setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
                })}
              />
            </Field>
          </div>
          <p className="-mt-1 text-sm text-muted-foreground">{t("locationHint")}</p>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="type-headline mb-4 text-foreground">{t("sectionLandWater")}</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <EnumSelect control={control} name="irrigationType" label={t("irrigationTypeLabel")} values={IRRIGATION} ns="irrigationType" />
            <EnumSelect control={control} name="waterSource" label={t("waterSourceLabel")} values={WATER_SOURCES} ns="waterSource" />
            <EnumSelect control={control} name="soilType" label={t("soilTypeLabel")} values={SOILS} ns="soilType" />
          </div>
        </fieldset>

        <FormError>{serverError}</FormError>

        <Button type="submit" size="lg" disabled={isSubmitting} className="sm:w-fit sm:min-w-48">
          {isSubmitting ? t("creatingFarm") : t("createFarm")}
        </Button>
      </form>
    </Card>
  );
}

function EnumSelect({
  control,
  name,
  label,
  values,
  ns,
}: {
  control: ReturnType<typeof useForm<FarmFormValues>>["control"];
  name: "irrigationType" | "waterSource" | "soilType";
  label: string;
  values: readonly string[];
  ns: "irrigationType" | "waterSource" | "soilType";
}) {
  const tCommon = useTranslations("common");
  return (
    <Field label={label} htmlFor={name}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} className="w-full">
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
