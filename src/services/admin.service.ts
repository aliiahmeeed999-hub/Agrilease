import { apiRequest } from "@/services/api-client";
import type {
  AdminAnalyticsSummary,
  AdminUserListItem,
  AdminEquipmentListItem,
  AdminTransactionListItem,
  AdminActivityLogListItem,
  AdminFinancingRequestListItem,
} from "@/types/admin";
import type { Role, VerificationStatus, AdminActionType, EquipmentCategory, FinancingStatus } from "@/generated/prisma/enums";

export function getAdminAnalyticsSummary() {
  return apiRequest<AdminAnalyticsSummary>("/api/admin/analytics/summary");
}

export interface AdminUserFilters {
  search?: string;
  role?: Role;
  verificationStatus?: VerificationStatus;
}

export function listAdminUsers(filters: AdminUserFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.verificationStatus) params.set("verificationStatus", filters.verificationStatus);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ users: AdminUserListItem[] }>(`/api/admin/users${query}`);
}

export function updateAdminUser(
  id: string,
  patch: { isSuspended?: boolean; role?: Role; verificationStatus?: VerificationStatus }
) {
  return apiRequest<{ id: string; isSuspended: boolean; role: Role; verificationStatus: VerificationStatus }>(
    `/api/admin/users/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
}

export function listAdminEquipment() {
  return apiRequest<{ equipment: AdminEquipmentListItem[] }>("/api/admin/equipment");
}

export function updateAdminEquipment(
  id: string,
  patch: { isFlagged?: boolean; isListed?: boolean; requiresModeration?: boolean }
) {
  return apiRequest<AdminEquipmentListItem>(`/api/admin/equipment/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function listAdminTransactions(page = 1) {
  return apiRequest<{ transactions: AdminTransactionListItem[]; page: number; pageSize: number; total: number }>(
    `/api/admin/transactions?page=${page}`
  );
}

export interface AdminFinancingFilters {
  region?: string;
  primaryEquipmentCategory?: EquipmentCategory;
  status?: FinancingStatus;
  chosenOfferInstitution?: string;
  page?: number;
}

export function listAdminFinancing(filters: AdminFinancingFilters = {}) {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.primaryEquipmentCategory) params.set("primaryEquipmentCategory", filters.primaryEquipmentCategory);
  if (filters.status) params.set("status", filters.status);
  if (filters.chosenOfferInstitution) params.set("chosenOfferInstitution", filters.chosenOfferInstitution);
  params.set("page", String(filters.page ?? 1));
  return apiRequest<{ requests: AdminFinancingRequestListItem[]; page: number; pageSize: number; total: number }>(
    `/api/admin/financing?${params.toString()}`
  );
}

export interface AdminActivityLogFilters {
  page?: number;
  actorId?: string;
  targetId?: string;
  action?: AdminActionType;
}

export function listAdminActivityLog(filters: AdminActivityLogFilters = {}) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.targetId) params.set("targetId", filters.targetId);
  if (filters.action) params.set("action", filters.action);
  return apiRequest<{ entries: AdminActivityLogListItem[]; page: number; pageSize: number; total: number }>(
    `/api/admin/activity-log?${params.toString()}`
  );
}
