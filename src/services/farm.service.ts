import { apiRequest } from "@/services/api-client";
import type {
  FarmListItem,
  FarmDetail,
  FarmFieldItem,
  CreateFarmInput,
  UpdateFarmInput,
  CreateFieldInput,
  UpdateFieldInput,
} from "@/types/farm";

export function listFarms() {
  return apiRequest<{ farms: FarmListItem[] }>("/api/farms");
}

export function getFarm(id: string) {
  return apiRequest<FarmDetail>(`/api/farms/${id}`);
}

export function createFarm(input: CreateFarmInput) {
  return apiRequest<FarmDetail>("/api/farms", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateFarm(id: string, patch: UpdateFarmInput) {
  return apiRequest<FarmDetail>(`/api/farms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function createField(farmId: string, input: CreateFieldInput) {
  return apiRequest<FarmFieldItem>(`/api/farms/${farmId}/fields`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateField(id: string, patch: UpdateFieldInput) {
  return apiRequest<FarmFieldItem>(`/api/fields/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
