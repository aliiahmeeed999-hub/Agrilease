import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateAdminUser } from "@/services/admin.service";
import { ApiError } from "@/services/api-client";

export function useSuspendUserAction() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(userId: string, isSuspended: boolean) {
    setPendingId(userId);
    setError(null);
    try {
      await updateAdminUser(userId, { isSuspended });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] }),
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
