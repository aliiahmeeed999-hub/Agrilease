import { apiRequest } from "@/services/api-client";
import type { BankerDashboardSummary, FinancingRequestListItem } from "@/types/banker";
import type { FinancingStatus } from "@/generated/prisma/enums";

export function getBankerDashboardSummary() {
  return apiRequest<BankerDashboardSummary>("/api/banker/dashboard/summary");
}

export function listFinancingRequests(status?: FinancingStatus) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<{ requests: FinancingRequestListItem[] }>(`/api/banker/financing-requests${query}`);
}

export function updateFinancingRequest(
  id: string,
  status: "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED",
  reviewNotes?: string
) {
  return apiRequest<FinancingRequestListItem>(`/api/banker/financing-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, reviewNotes }),
  });
}

export function listApprovedLoans() {
  return apiRequest<{ loans: FinancingRequestListItem[] }>("/api/banker/loans");
}
