import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateOwnerBooking } from "@/services/owner.service";
import { ApiError } from "@/services/api-client";

export function useBookingAction() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(bookingId: string, status: "APPROVED" | "REJECTED") {
    setPendingId(bookingId);
    setError(null);
    try {
      await updateOwnerBooking(bookingId, status);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "bookings", "list"] }),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return { act, pendingId, error };
}
