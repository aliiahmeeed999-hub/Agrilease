import { apiRequest } from "@/services/api-client";
import type { MyBookingListItem, CreateBookingInput, CreateReviewInput, BookingReview } from "@/types/booking";
import type { BookingStatus, TransactionType } from "@/generated/prisma/enums";

export function createBooking(input: CreateBookingInput) {
  return apiRequest<MyBookingListItem>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listMyBookings(status?: BookingStatus, type?: TransactionType) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ bookings: MyBookingListItem[] }>(`/api/bookings/mine${query}`);
}

export function cancelBooking(id: string) {
  return apiRequest<MyBookingListItem>(`/api/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "CANCELLED" }),
  });
}

export function submitReview(bookingId: string, input: CreateReviewInput) {
  return apiRequest<BookingReview>(`/api/bookings/${bookingId}/review`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
