import { apiRequest } from "@/services/api-client";
import type {
  OwnerDashboardSummary,
  OwnerEquipmentListItem,
  OwnerBookingListItem,
  OwnerSaleOfferListItem,
  CreateOwnerEquipmentInput,
  UpdateOwnerEquipmentInput,
} from "@/types/owner";
import type { BookingStatus } from "@/generated/prisma/enums";
import type { CalendarItem } from "@/types/calendar";

export function getOwnerDashboardSummary() {
  return apiRequest<OwnerDashboardSummary>("/api/owner/dashboard/summary");
}

export function listOwnerEquipment() {
  return apiRequest<{ equipment: OwnerEquipmentListItem[] }>("/api/owner/equipment");
}

export function updateOwnerEquipment(id: string, patch: UpdateOwnerEquipmentInput) {
  return apiRequest<OwnerEquipmentListItem>(`/api/owner/equipment/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function createOwnerEquipment(input: CreateOwnerEquipmentInput) {
  return apiRequest<OwnerEquipmentListItem>("/api/owner/equipment", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listOwnerBookings(status?: BookingStatus) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<{ bookings: OwnerBookingListItem[] }>(`/api/owner/bookings${query}`);
}

export function updateOwnerBooking(id: string, status: "APPROVED" | "REJECTED") {
  return apiRequest<OwnerBookingListItem>(`/api/owner/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listOwnerSaleOffers(status?: BookingStatus) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<{ offers: OwnerSaleOfferListItem[] }>(`/api/owner/sale-offers${query}`);
}

export function updateOwnerSaleOffer(id: string, status: "APPROVED" | "REJECTED") {
  return apiRequest<OwnerSaleOfferListItem>(`/api/owner/sale-offers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listOwnerCalendarItems() {
  return apiRequest<{ items: CalendarItem[] }>("/api/owner/calendar");
}
