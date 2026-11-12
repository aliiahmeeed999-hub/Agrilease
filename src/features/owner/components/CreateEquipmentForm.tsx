"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOwnerEquipment } from "@/services/owner.service";
import { ApiError } from "@/services/api-client";

const EQUIPMENT_CATEGORIES = [
  "TRACTOR",
  "COMBINE_HARVESTER",
  "TILLAGE",
  "SEEDING_PLANTING",
  "SPRAYER",
  "IRRIGATION",
  "TRANSPORT_TRAILER",
  "HARVESTING_OTHER",
  "UTILITY_VEHICLE",
  "OTHER",
] as const;
const EQUIPMENT_TYPES = ["TRACTOR", "HARVESTER", "SPRAYER", "PLOW", "TRAILER", "IRRIGATION_PUMP"] as const;
const LISTING_TYPES = ["RENT", "SALE", "RENT_AND_SALE"] as const;
const CONDITIONS = ["NEW", "USED"] as const;

interface EquipmentFormValues {
  name: string;
  type: (typeof EQUIPMENT_TYPES)[number];
  manufacturer: string;
  model: string;
  enginePowerHp: number;
  hitchCapacityKg: number;
  maxSpeedKmh: number;
  purchaseYear?: number;
  imageUrl?: string;
  category: (typeof EQUIPMENT_CATEGORIES)[number];
  listingType: (typeof LISTING_TYPES)[number];
  condition: (typeof CONDITIONS)[number];
  dailyRateMad?: number;
  salePrice?: number;
  negotiable?: boolean;
  yearOfManufacture?: number;
  hoursUsed?: number;
  conditionNotes?: string;
  warrantyMonths?: number;
  dealerCertified?: boolean;
}

const optionalNumber = {
  setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
};

export function CreateEquipmentForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same rules as before; built here so the messages are translated.
  const equipmentSchema = useMemo(() => {
    const positive = z.number({ message: t("positiveRequired") }).positive(t("positiveRequired"));
    return z
      .object({
        name: z.string().min(2, t("nameRequired")),
        type: z.enum(EQUIPMENT_TYPES, { message: t("typeRequired") }),
        manufacturer: z.string().min(1, t("manufacturerRequired")),
        model: z.string().min(1, t("modelRequired")),
        enginePowerHp: positive,
        hitchCapacityKg: positive,
        maxSpeedKmh: positive,
        purchaseYear: z.number().int().optional(),
        imageUrl: z.string().optional(),
        category: z.enum(EQUIPMENT_CATEGORIES, { message: t("categoryRequired") }),
        listingType: z.enum(LISTING_TYPES, { message: t("listingTypeRequired") }),
        condition: z.enum(CONDITIONS, { message: t("conditionRequired") }),
        dailyRateMad: z.number().positive().optional(),
        salePrice: z.number().positive().optional(),
        negotiable: z.boolean().optional(),
        yearOfManufacture: z.number().int().optional(),
        hoursUsed: z.number().nonnegative().optional(),
        conditionNotes: z.string().optional(),
        warrantyMonths: z.number().int().nonnegative().optional(),
        dealerCertified: z.boolean().optional(),
      })
      .superRefine((data, ctx) => {
        if ((data.listingType === "RENT" || data.listingType === "RENT_AND_SALE") && data.dailyRateMad == null) {
          ctx.addIssue({ code: "custom", path: ["dailyRateMad"], message: t("rateRequired") });
        }
        if ((data.listingType === "SALE" || data.listingType === "RENT_AND_SALE") && data.salePrice == null) {
          ctx.addIssue({ code: "custom", path: ["salePrice"], message: t("priceRequired") });
        }
        if (data.condition === "USED") {
          if (data.yearOfManufacture == null) {
            ctx.addIssue({ code: "custom", path: ["yearOfManufacture"], message: t("requiredForUsed") });
          }
          if (data.hoursUsed == null) {
            ctx.addIssue({ code: "custom", path: ["hoursUsed"], message: t("requiredForUsed") });
          }
        }
      });
  }, [t]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<EquipmentFormValues>({ resolver: zodResolver(equipmentSchema) });

  const listingType = watch("listingType");
  const condition = watch("condition");
  const showRent = listingType === "RENT" || listingType === "RENT_AND_SALE";
  const showSale = listingType === "SALE" || listingType === "RENT_AND_SALE";

  async function onSubmit(values: EquipmentFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await createOwnerEquipment(values);
      await queryClient.invalidateQueries({ queryKey: ["owner", "equipment", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["owner", "dashboard", "summary"] });
      router.push(redirectTo ?? "/owner/listings");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const a11y = (name: keyof EquipmentFormValues) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": fieldMessageId(name),
  });

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-5">
          <legend className="type-headline mb-4 text-foreground">{t("sectionDetails")}</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("nameLabel")} htmlFor="name" error={errors.name?.message}>
              <Input id="name" placeholder={t("namePlaceholder")} {...a11y("name")} {...register("name")} />
            </Field>
            <EnumSelect control={control} name="type" label={t("typeLabel")} values={EQUIPMENT_TYPES} labelFor={(v) => tCommon(`equipmentType.${v}`)} error={errors.type?.message} />
            <Field label={t("manufacturer")} htmlFor="manufacturer" error={errors.manufacturer?.message}>
              <Input id="manufacturer" placeholder="John Deere" {...a11y("manufacturer")} {...register("manufacturer")} />
            </Field>
            <Field label={t("model")} htmlFor="model" error={errors.model?.message}>
              <Input id="model" placeholder="6R 155" {...a11y("model")} {...register("model")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
            <Field label={t("enginePowerHp")} htmlFor="enginePowerHp" error={errors.enginePowerHp?.message}>
              <Input id="enginePowerHp" type="number" inputMode="numeric" min={0} {...a11y("enginePowerHp")} {...register("enginePowerHp", { valueAsNumber: true })} />
            </Field>
            <Field label={t("hitchCapacityKg")} htmlFor="hitchCapacityKg" error={errors.hitchCapacityKg?.message}>
              <Input id="hitchCapacityKg" type="number" inputMode="numeric" min={0} {...a11y("hitchCapacityKg")} {...register("hitchCapacityKg", { valueAsNumber: true })} />
            </Field>
            <Field label={t("maxSpeedKmh")} htmlFor="maxSpeedKmh" error={errors.maxSpeedKmh?.message}>
              <Input id="maxSpeedKmh" type="number" inputMode="decimal" min={0} step="0.1" {...a11y("maxSpeedKmh")} {...register("maxSpeedKmh", { valueAsNumber: true })} />
            </Field>
            <Field label={t("purchaseYear")} htmlFor="purchaseYear" error={errors.purchaseYear?.message}>
              <Input id="purchaseYear" type="number" inputMode="numeric" {...register("purchaseYear", optionalNumber)} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="type-headline mb-4 text-foreground">{t("sectionListing")}</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <EnumSelect control={control} name="category" label={t("categoryLabel")} values={EQUIPMENT_CATEGORIES} labelFor={(v) => tCommon(`equipmentCategory.${v}`)} error={errors.category?.message} />
            <EnumSelect control={control} name="listingType" label={t("listingTypeLabel")} values={LISTING_TYPES} labelFor={(v) => t(`listingType.${v}`)} error={errors.listingType?.message} />
            {showRent && (
              <Field label={t("dailyRate")} htmlFor="dailyRateMad" error={errors.dailyRateMad?.message}>
                <Input id="dailyRateMad" type="number" inputMode="numeric" min={0} {...a11y("dailyRateMad")} {...register("dailyRateMad", optionalNumber)} />
              </Field>
            )}
            {showSale && (
              <Field label={t("salePriceLabel")} htmlFor="salePrice" error={errors.salePrice?.message}>
                <Input id="salePrice" type="number" inputMode="numeric" min={0} {...a11y("salePrice")} {...register("salePrice", optionalNumber)} />
              </Field>
            )}
          </div>
          {showSale && <SwitchRow control={control} name="negotiable" label={t("negotiableLabel")} />}
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="type-headline mb-4 text-foreground">{t("sectionCondition")}</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <EnumSelect control={control} name="condition" label={t("conditionLabel")} values={CONDITIONS} labelFor={(v) => tCommon(`condition.${v}`)} error={errors.condition?.message} />
          </div>

          {condition === "USED" && (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                <Field label={t("yearOfManufacture")} htmlFor="yearOfManufacture" error={errors.yearOfManufacture?.message}>
                  <Input id="yearOfManufacture" type="number" inputMode="numeric" {...a11y("yearOfManufacture")} {...register("yearOfManufacture", optionalNumber)} />
                </Field>
                <Field label={t("hoursUsed")} htmlFor="hoursUsed" error={errors.hoursUsed?.message}>
                  <Input id="hoursUsed" type="number" inputMode="numeric" min={0} {...a11y("hoursUsed")} {...register("hoursUsed", optionalNumber)} />
                </Field>
              </div>
              <Field label={t("conditionNotes")} htmlFor="conditionNotes">
                <Textarea id="conditionNotes" {...register("conditionNotes")} />
              </Field>
            </>
          )}

          {condition === "NEW" && (
            <div className="grid grid-cols-1 items-end gap-5 sm:grid-cols-2">
              <Field label={t("warrantyMonths")} htmlFor="warrantyMonths">
                <Input id="warrantyMonths" type="number" inputMode="numeric" min={0} {...register("warrantyMonths", optionalNumber)} />
              </Field>
              <SwitchRow control={control} name="dealerCertified" label={t("dealerCertified")} />
            </div>
          )}
        </fieldset>

        <FormError>{serverError}</FormError>

        <Button type="submit" size="lg" disabled={isSubmitting} className="sm:w-fit sm:min-w-48">
          {isSubmitting ? t("creatingEquipment") : t("addEquipment")}
        </Button>
      </form>
    </Card>
  );
}

function EnumSelect<N extends "type" | "category" | "listingType" | "condition">({
  control,
  name,
  label,
  values,
  labelFor,
  error,
}: {
  control: Control<EquipmentFormValues>;
  name: N;
  label: string;
  values: readonly string[];
  labelFor: (value: string) => string;
  error?: string;
}) {
  const tCommon = useTranslations("common");
  return (
    <Field label={label} htmlFor={name} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value as string | undefined} onValueChange={field.onChange}>
            <SelectTrigger id={name} className="w-full" aria-invalid={!!error}>
              <SelectValue placeholder={tCommon("select")}>
                {(v: string | null) => (v ? labelFor(v) : tCommon("select"))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {values.map((v) => (
                <SelectItem key={v} value={v}>
                  {labelFor(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

// A yes/no setting: the whole row is the label, so tapping anywhere flips it.
function SwitchRow({
  control,
  name,
  label,
}: {
  control: Control<EquipmentFormValues>;
  name: "negotiable" | "dealerCertified";
  label: string;
}) {
  return (
    <label htmlFor={name} className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-4 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Switch id={name} checked={field.value ?? false} onCheckedChange={field.onChange} />}
      />
    </label>
  );
}
