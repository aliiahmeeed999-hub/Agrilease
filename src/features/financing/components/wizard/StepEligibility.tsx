"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import type { FinancingApplicationFormValues } from "@/features/financing/hooks/useFinancingApplication";

// A yes/no question. The whole row is the label, so a tap anywhere on it
// flips the switch.
function QuestionRow({
  id,
  question,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  question: string;
  hint?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-4 py-3.5 transition-colors has-data-checked:border-primary/50 has-data-checked:bg-primary/5"
    >
      <span>
        <span className="block text-sm leading-snug font-medium text-foreground">{question}</span>
        {hint && <span className="mt-1 block text-sm leading-snug text-muted-foreground">{hint}</span>}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function StepEligibility({ form }: { form: UseFormReturn<FinancingApplicationFormValues> }) {
  const t = useTranslations("financing.apply");
  const { watch, setValue } = form;
  const hasPriorFinancing = watch("hasPriorFinancing");
  const subsidyRequested = watch("subsidyRequested");
  const chosenOfferMode = watch("chosenOfferMode");

  return (
    <div className="flex flex-col gap-3">
      <QuestionRow
        id="hasPriorFinancing"
        question={t("hasPriorFinancingLabel")}
        checked={hasPriorFinancing ?? false}
        onCheckedChange={(checked) => setValue("hasPriorFinancing", checked)}
      />
      <QuestionRow
        id="subsidyRequested"
        question={t("subsidyRequestedLabel")}
        hint={chosenOfferMode === "PUBLIC_PROGRAM" ? t("subsidyRequestedHint") : undefined}
        checked={subsidyRequested ?? false}
        onCheckedChange={(checked) => setValue("subsidyRequested", checked)}
      />
    </div>
  );
}
