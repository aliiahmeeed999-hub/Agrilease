import { useQuery } from "@tanstack/react-query";
import { listOwnerBookings } from "@/services/owner.service";
import type { BookingStatus } from "@/generated/prisma/enums";

export function useOwnerBookings(status?: BookingStatus) {
  return useQuery({
    queryKey: ["owner", "bookings", "list", status],
    queryFn: () => listOwnerBookings(status),
  });
}
