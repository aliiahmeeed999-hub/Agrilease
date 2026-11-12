"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { createBooking } from "@/services/booking.service";
import { ApiError } from "@/services/api-client";
import { cn } from "@/utils/cn";
import type { MarketplaceEquipmentDetail } from "@/types/marketplace";

interface PurchaseFormValues {
  offeredPriceMad: number;
  notes?: string;
  financingRequested?: boolean;
}

export function BuyOrBorrowForm({ equipment }: { equipment: MarketplaceEquipmentDetail }) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same rules as before; built here only so the message is translated.
  const purchaseSchema = useMemo(
    () =>
      z.object({
        offeredPriceMad: z.number({ message: t("enterValidPrice") }).positive(t("enterValidPrice")),
        notes: z.string().max(500).optional(),
        financingRequested: z.boolean().optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { offeredPriceMad: equipment.salePrice ?? undefined, financingRequested: false },
  });

  const financingRequested = watch("financingRequested");

  async function onSubmit(values: PurchaseFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await createBooking({
        type: "SALE",
        equipmentId: equipment.id,
        offeredPriceMad: values.offeredPriceMad,
        notes: values.notes,
        financingRequested: values.financingRequested,
      });
      await queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      router.push(values.financingRequested ? "/financing" : "/transactions?type=purchases");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <h2 className="type-headline text-foreground">{t("buyFormTitle")}</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3.5">
          <p className="text-sm text-muted-foreground">{t("listedPriceLabel")}</p>
          <p className="tabular text-lg font-semibold text-foreground">
            {format.number(equipment.salePrice ?? 0)}{" "}
            <span className="text-sm font-medium text-muted-foreground">{tCommon("currencyMad")}</span>
          </p>
        </div>

        {/* A fixed price is shown once, above. The offer field only appears
            when there is something for the buyer to decide. */}
        {equipment.negotiable ? (
          <Field label={t("offerLabel")} htmlFor="offeredPriceMad" error={errors.offeredPriceMad?.message}>
            <Input
              id="offeredPriceMad"
              type="number"
              inputMode="decimal"
              step="0.01"
              aria-invalid={!!errors.offeredPriceMad}
              aria-describedby={fieldMessageId("offeredPriceMad")}
              {...register("offeredPriceMad", { valueAsNumber: true })}
            />
          </Field>
        ) : (
          <>
            <input type="hidden" {...register("offeredPriceMad", { valueAsNumber: true })} />
            <p className="-mt-2 text-sm text-muted-foreground">{t("fixedPriceNote")}</p>
            <FormError>{errors.offeredPriceMad?.message}</FormError>
          </>
        )}

        <Field label={t("messageFieldLabel")} htmlFor="purchaseNotes" optionalLabel={tCommon("optional")}>
          <Input id="purchaseNotes" {...register("notes")} />
        </Field>

        <div className="rounded-xl border border-border">
          <label htmlFor="financingRequested" className="flex min-h-13 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-medium text-foreground">{t("needFinancing")}</span>
            <Switch
              id="financingRequested"
              checked={financingRequested ?? false}
              onCheckedChange={(checked) => setValue("financingRequested", checked)}
            />
          </label>
          {financingRequested && (
            <p className="border-t border-border px-4 py-3 text-sm leading-snug text-muted-foreground">{t("financingHint")}</p>
          )}
        </div>

        <FormError>{serverError}</FormError>

        <div className="flex flex-col gap-2.5">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t("submittingOffer") : financingRequested ? t("borrowToBuy") : t("buyOutright")}
          </Button>
          <Link
            href={{
              pathname: "/financing/simulate",
              query: {
                equipmentId: equipment.id,
                equipmentName: equipment.name,
                price: String(equipment.salePrice ?? 0),
                qty: "1",
              },
            }}
            className={cn(buttonVariants({ variant: "ghost" }), "text-primary hover:text-primary")}
          >
            <Calculator aria-hidden="true" />
            {t("simulateFinancing")}
          </Link>
        </div>
      </form>
    </Card>
  );
}
