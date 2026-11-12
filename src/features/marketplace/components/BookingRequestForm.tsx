"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { createBooking } from "@/services/booking.service";
import { ApiError } from "@/services/api-client";
import { diffInDays } from "@/utils/format";
import type { MarketplaceEquipmentDetail } from "@/types/marketplace";

interface BookingFormValues {
  startDate: string;
  endDate: string;
  notes?: string;
}

// Computed once at module load rather than per-render — this only needs to
// change once per calendar day, not on every keystroke/re-render of the form.
const TODAY_ISO = new Date().toISOString().slice(0, 10);

export function BookingRequestForm({ equipment }: { equipment: MarketplaceEquipmentDetail }) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same rules as before; built here only so the messages are translated.
  const bookingSchema = useMemo(
    () =>
      z
        .object({
          startDate: z.string().min(1, t("pickStartDate")),
          endDate: z.string().min(1, t("pickReturnDate")),
          notes: z.string().max(500).optional(),
        })
        .refine((data) => data.endDate > data.startDate, {
          message: t("returnAfterStart"),
          path: ["endDate"],
        }),
    [t]
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({ resolver: zodResolver(bookingSchema) });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  let days: number | null = null;
  let estimatedTotal: number | null = null;
  if (startDate && endDate && endDate > startDate) {
    days = diffInDays(new Date(startDate), new Date(endDate));
    estimatedTotal = days * (equipment.dailyRateMad ?? 0);
  }

  async function onSubmit(values: BookingFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await createBooking({
        equipmentId: equipment.id,
        startDate: values.startDate,
        endDate: values.endDate,
        notes: values.notes,
      });
      await queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      router.push("/transactions");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <h2 className="type-headline text-foreground">{t("rentFormTitle")}</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 flex flex-col gap-5">
        <div className="grid gap-4 min-[420px]:grid-cols-2">
          <Field label={t("startDateLabel")} htmlFor="startDate" error={errors.startDate?.message}>
            <Input
              id="startDate"
              type="date"
              min={TODAY_ISO}
              aria-invalid={!!errors.startDate}
              aria-describedby={fieldMessageId("startDate")}
              {...register("startDate")}
            />
          </Field>
          <Field label={t("returnDateLabel")} htmlFor="endDate" error={errors.endDate?.message}>
            <Input
              id="endDate"
              type="date"
              min={startDate || TODAY_ISO}
              aria-invalid={!!errors.endDate}
              aria-describedby={fieldMessageId("endDate")}
              {...register("endDate")}
            />
          </Field>
        </div>

        <Field label={t("notesLabel")} htmlFor="notes" optionalLabel={tCommon("optional")}>
          <Input id="notes" placeholder={t("notesPlaceholder")} {...register("notes")} />
        </Field>

        {/* Live price feedback: the total follows the dates as they change,
            before anything is sent. */}
        {estimatedTotal != null && days != null && (
          <div aria-live="polite" className="flex items-baseline justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">{t("estimatedTotal")}</p>
              <p className="text-sm text-muted-foreground">{t("estimatedDays", { days })}</p>
            </div>
            <p className="tabular text-xl font-semibold text-foreground">
              {format.number(estimatedTotal)}{" "}
              <span className="text-sm font-medium text-muted-foreground">{tCommon("currencyMad")}</span>
            </p>
          </div>
        )}

        <FormError>{serverError}</FormError>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t("sendingRequest") : t("requestRental")}
        </Button>
      </form>
    </Card>
  );
}
