import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cancelBooking } from "@/services/booking.service";
import { ApiError } from "@/services/api-client";

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancel(bookingId: string) {
    setPendingId(bookingId);
    setError(null);
    try {
      await cancelBooking(bookingId);
      await queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return { cancel, pendingId, error };
}
