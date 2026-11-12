import { apiRequest } from "@/services/api-client";
import type {
  EquipmentListItem,
  EquipmentDetail,
  EquipmentTrackPointDto,
  EquipmentPerformanceSampleDto,
  EquipmentAlertDto,
} from "@/types/equipment";

export function listEquipment() {
  return apiRequest<{ equipment: EquipmentListItem[] }>("/api/equipment");
}

export function getEquipmentDetail(id: string) {
  return apiRequest<EquipmentDetail>(`/api/equipment/${id}`);
}

export function getEquipmentTrack(id: string) {
  return apiRequest<{ points: EquipmentTrackPointDto[] }>(`/api/equipment/${id}/track`);
}

export function getEquipmentPerformance(id: string, days = 10) {
  return apiRequest<{ samples: EquipmentPerformanceSampleDto[] }>(
    `/api/equipment/${id}/performance?days=${days}`
  );
}

export function getEquipmentAlerts(id: string, limit = 20) {
  return apiRequest<{ alerts: EquipmentAlertDto[] }>(`/api/equipment/${id}/alerts?limit=${limit}`);
}
