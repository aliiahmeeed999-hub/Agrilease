import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateFinancingRequest } from "@/services/banker.service";
import { ApiError } from "@/services/api-client";

export function useFinancingRequestAction() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(
    id: string,
    status: "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED",
    reviewNotes?: string
  ) {
    setPendingId(id);
    setError(null);
    try {
      await updateFinancingRequest(id, status, reviewNotes);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["banker", "dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["banker", "financing-requests", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["banker", "loans"] }),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return { act, pendingId, error };
}
