import { apiRequest } from "@/services/api-client";
import type { SoilSnapshot } from "@/types/soil";

export function getFarmSoil(farmId: string) {
  return apiRequest<SoilSnapshot>(`/api/farms/${farmId}/soil`);
}
