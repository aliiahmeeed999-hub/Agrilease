import { apiRequest } from "@/services/api-client";
import type { MaintenanceRecordItem, CreateMaintenanceInput } from "@/types/maintenance";

export function listMaintenance(equipmentId: string) {
  return apiRequest<{ records: MaintenanceRecordItem[] }>(`/api/owner/equipment/${equipmentId}/maintenance`);
}

export function createMaintenance(equipmentId: string, input: CreateMaintenanceInput) {
  return apiRequest<MaintenanceRecordItem>(`/api/owner/equipment/${equipmentId}/maintenance`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
