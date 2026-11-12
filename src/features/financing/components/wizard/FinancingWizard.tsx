"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { WizardStepper } from "@/features/financing/components/wizard/WizardStepper";
import { StepIdentification } from "@/features/financing/components/wizard/StepIdentification";
import { StepExploitation } from "@/features/financing/components/wizard/StepExploitation";
import { StepEligibility } from "@/features/financing/components/wizard/StepEligibility";
import { StepDocuments } from "@/features/financing/components/wizard/StepDocuments";
import { StepRecap } from "@/features/financing/components/wizard/StepRecap";
import type { useFinancingApplication } from "@/features/financing/hooks/useFinancingApplication";
import type { FinancingDocumentType } from "@/types/financing";

const LAST_STEP = 4;

export function FinancingWizard({ app }: { app: ReturnType<typeof useFinancingApplication> }) {
  const t = useTranslations("financing.apply");
  const tCommon = useTranslations("common");
  const { form, id, step, goToStep, documentUrls, setDocumentUrls, isSaving, isSubmitting, serverError, saveDraft, submit } =
    app;

  function handleDocumentChange(docType: FinancingDocumentType, url: string | null) {
    setDocumentUrls((prev) => {
      const next = { ...prev };
      if (url) next[docType] = url;
      else delete next[docType];
      return next;
    });
  }

  return (
    <Card className="gap-0 p-5 sm:p-8">
      <WizardStepper step={step} onStepClick={(i) => goToStep(i)} />

      {step === 0 && <StepIdentification form={form} />}
      {step === 1 && <StepExploitation form={form} />}
      {step === 2 && <StepEligibility form={form} />}
      {step === 3 && <StepDocuments requestId={id} documentUrls={documentUrls} onChange={handleDocumentChange} />}
      {step === LAST_STEP && <StepRecap values={form.watch()} documentUrls={documentUrls} />}

      <FormError className="mt-5">{serverError}</FormError>

      {/* One row of actions in one fixed order on every step: go back on the
          leading side, move forward on the trailing side, with the forward
          action the only filled button. On a phone the forward action goes
          on top, full width, where the thumb reaches it first. */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3 max-sm:*:flex-1">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => goToStep(step - 1)}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
            {tCommon("back")}
          </Button>
          <Button type="button" variant="outline" disabled={isSaving} onClick={saveDraft}>
            {isSaving ? tCommon("saving") : t("saveDraftCta")}
          </Button>
        </div>
        {step < LAST_STEP ? (
          <Button type="button" size="lg" className="sm:h-10 sm:px-5 sm:text-sm" onClick={() => goToStep(step + 1)}>
            {tCommon("next")}
            <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" size="lg" className="sm:h-10 sm:px-5 sm:text-sm" disabled={isSubmitting} onClick={submit}>
            {isSubmitting ? tCommon("saving") : t("submitCta")}
          </Button>
        )}
      </div>
    </Card>
  );
}
