import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMaintenance, createMaintenance } from "@/services/maintenance.service";
import { ApiError } from "@/services/api-client";
import type { CreateMaintenanceInput } from "@/types/maintenance";

export function useMaintenance(equipmentId: string) {
  return useQuery({
    queryKey: ["equipment", equipmentId, "maintenance"],
    queryFn: () => listMaintenance(equipmentId),
  });
}

export function useCreateMaintenance(equipmentId: string) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: CreateMaintenanceInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      await createMaintenance(equipmentId, input);
      await queryClient.invalidateQueries({ queryKey: ["equipment", equipmentId, "maintenance"] });
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
