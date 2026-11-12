import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCropCycles, closeCropCycle } from "@/services/cropCycle.service";
import { ApiError } from "@/services/api-client";
import type { CloseCropCycleInput } from "@/types/cropCycle";

export function useCropCycles(fieldId: string) {
  return useQuery({
    queryKey: ["fields", fieldId, "crop-cycles"],
    queryFn: () => listCropCycles(fieldId),
  });
}

export function useCloseCropCycle(fieldId: string) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(cycleId: string, input: CloseCropCycleInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      await closeCropCycle(cycleId, input);
      await queryClient.invalidateQueries({ queryKey: ["fields", fieldId, "crop-cycles"] });
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { submit, isSubmitting, error };
}
