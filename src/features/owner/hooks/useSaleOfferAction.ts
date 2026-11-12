import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateOwnerSaleOffer } from "@/services/owner.service";
import { ApiError } from "@/services/api-client";

export function useSaleOfferAction() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(offerId: string, status: "APPROVED" | "REJECTED") {
    setPendingId(offerId);
    setError(null);
    try {
      await updateOwnerSaleOffer(offerId, status);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "sale-offers", "list"] }),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return { act, pendingId, error };
}
