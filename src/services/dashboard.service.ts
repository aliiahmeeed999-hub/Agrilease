import { apiRequest } from "@/services/api-client";
import type { DashboardSummary } from "@/types/dashboard";

export function getDashboardSummary() {
  return apiRequest<DashboardSummary>("/api/dashboard/summary");
}
