import { apiRequest } from "@/services/api-client";
import type { CropCycleItem, CloseCropCycleInput } from "@/types/cropCycle";

export function listCropCycles(fieldId: string) {
  return apiRequest<{ cycles: CropCycleItem[] }>(`/api/fields/${fieldId}/crop-cycles`);
}

export function closeCropCycle(cycleId: string, input: CloseCropCycleInput) {
  return apiRequest<CropCycleItem>(`/api/crop-cycles/${cycleId}/close`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
