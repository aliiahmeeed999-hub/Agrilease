"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { createFinancingRequest, updateFinancingRequest } from "@/services/financing.service";
import { ApiError } from "@/services/api-client";
import type { FinancingApplicationPayload, FinancingDocumentType } from "@/types/financing";

export type FinancingApplicationFormValues = FinancingApplicationPayload;

export const WIZARD_STEP_COUNT = 5;
export const DOCUMENTS_STEP_INDEX = 3;

interface UseFinancingApplicationOptions {
  id?: string;
  defaultValues: FinancingApplicationFormValues;
  initialDocumentUrls?: Partial<Record<FinancingDocumentType, string>> | null;
  initialStep?: number;
}

export function useFinancingApplication({
  id: initialId,
  defaultValues,
  initialDocumentUrls,
  initialStep = 0,
}: UseFinancingApplicationOptions) {
  const router = useRouter();
  const form = useForm<FinancingApplicationFormValues>({ defaultValues });
  const [id, setId] = useState<string | undefined>(initialId);
  const [documentUrls, setDocumentUrls] = useState<Partial<Record<FinancingDocumentType, string>>>(
    initialDocumentUrls ?? {}
  );
  const [step, setStep] = useState(initialStep);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function saveDraft(): Promise<string | undefined> {
    setServerError(null);
    setIsSaving(true);
    try {
      const values = form.getValues();
      if (id) {
        await updateFinancingRequest(id, "DRAFT", values);
        return id;
      }
      const created = await createFinancingRequest("DRAFT", values);
      setId(created.id);
      router.replace(`/financing/apply/${created.id}`);
      return created.id;
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue. Veuillez réessayer.");
      return undefined;
    } finally {
      setIsSaving(false);
    }
  }

  // Ensures a persisted draft exists before moving past the first step, so
  // the Documents step (which needs a real id to upload against) and
  // "resume later" always have somewhere to save to.
  async function goToStep(next: number) {
    if (!id && next > 0) {
      await saveDraft();
    }
    setStep(Math.max(0, Math.min(next, WIZARD_STEP_COUNT - 1)));
  }

  async function submit() {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const values = form.getValues();
      if (id) {
        await updateFinancingRequest(id, "SUBMITTED", values);
      } else {
        await createFinancingRequest("SUBMITTED", values);
      }
      router.push("/financing");
      return true;
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue. Veuillez réessayer.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    id,
    step,
    goToStep,
    documentUrls,
    setDocumentUrls,
    isSaving,
    isSubmitting,
    serverError,
    saveDraft,
    submit,
  };
}
