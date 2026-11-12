import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateAdminEquipment } from "@/services/admin.service";
import { ApiError } from "@/services/api-client";

export function useFlagEquipmentAction() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(
    equipmentId: string,
    patch: { isFlagged?: boolean; isListed?: boolean; requiresModeration?: boolean }
  ) {
    setPendingId(equipmentId);
    setError(null);
    try {
      await updateAdminEquipment(equipmentId, patch);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "equipment", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "analytics", "summary"] }),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return { act, pendingId, error };
}
