import type { BookingStatus, TransactionType } from "@/generated/prisma/enums";

// SALE bookings have no date range at all - eligibility is immediate on
// approval. RENT bookings still require the rental period to have passed.
export function isBookingReviewEligible(booking: {
  status: BookingStatus;
  type: TransactionType;
  endDate: Date | null;
}): boolean {
  if (booking.status !== "APPROVED") return false;
  if (booking.type === "SALE") return true;
  return booking.endDate !== null && booking.endDate.getTime() < Date.now();
}
