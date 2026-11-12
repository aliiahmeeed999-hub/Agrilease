import { useQuery } from "@tanstack/react-query";
import { listMyBookings } from "@/services/booking.service";
import type { BookingStatus, TransactionType } from "@/generated/prisma/enums";

export function useMyBookings(status?: BookingStatus, type?: TransactionType) {
  return useQuery({
    queryKey: ["bookings", "mine", status, type],
    queryFn: () => listMyBookings(status, type),
  });
}
