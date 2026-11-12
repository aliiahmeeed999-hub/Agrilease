"use client";

import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WizardField } from "@/features/financing/components/wizard/WizardField";
import type { FinancingApplicationFormValues } from "@/features/financing/hooks/useFinancingApplication";

const CLIENT_TYPES = [
  "INDIVIDUAL_FARMER",
  "COOPERATIVE",
  "GIE",
  "AGRICULTURAL_COMPANY",
  "ENTERPRISE",
  "COLLECTIVITY",
  "OTHER",
] as const;

export function StepIdentification({ form }: { form: UseFormReturn<FinancingApplicationFormValues> }) {
  const t = useTranslations("financing.apply");
  const { register, watch, setValue } = form;
  const clientType = watch("clientType");

  return (
    <div className="flex flex-col gap-5">
      <WizardField label={t("clientTypeLabel")} htmlFor="clientType">
        <Select value={clientType ?? ""} onValueChange={(v) => setValue("clientType", v ?? undefined)}>
          <SelectTrigger id="clientType" className="w-full sm:w-80">
            <SelectValue placeholder={t("clientTypePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_TYPES.map((ct) => (
              <SelectItem key={ct} value={ct}>
                {t(`clientType.${ct}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </WizardField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <WizardField label={t("applicantNameLabel")} htmlFor="applicantName">
          <Input id="applicantName" autoComplete="name" {...register("applicantName")} />
        </WizardField>
        <WizardField label={t("applicantIdNumberLabel")} htmlFor="applicantIdNumber">
          <Input id="applicantIdNumber" dir="ltr" className="text-start" autoCapitalize="characters" {...register("applicantIdNumber")} />
        </WizardField>
        <WizardField label={t("applicantPhoneLabel")} htmlFor="applicantPhone">
          <Input id="applicantPhone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className="text-start" {...register("applicantPhone")} />
        </WizardField>
        <WizardField label={t("applicantEmailLabel")} htmlFor="applicantEmail">
          <Input id="applicantEmail" type="email" inputMode="email" autoComplete="email" dir="ltr" className="text-start" {...register("applicantEmail")} />
        </WizardField>
        <WizardField label={t("regionLabel")} htmlFor="region">
          <Input id="region" {...register("region")} />
        </WizardField>
        <WizardField label={t("provinceLabel")} htmlFor="province">
          <Input id="province" {...register("province")} />
        </WizardField>
        <WizardField label={t("communeLabel")} htmlFor="commune">
          <Input id="commune" {...register("commune")} />
        </WizardField>
      </div>
    </div>
  );
}
