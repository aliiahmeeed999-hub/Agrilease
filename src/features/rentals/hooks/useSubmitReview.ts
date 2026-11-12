import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { submitReview } from "@/services/booking.service";
import { ApiError } from "@/services/api-client";
import type { CreateReviewInput } from "@/types/booking";

export function useSubmitReview() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(bookingId: string, input: CreateReviewInput) {
    setPendingId(bookingId);
    setError(null);
    try {
      await submitReview(bookingId, input);
      await queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  return { submit, pendingId, error };
}
