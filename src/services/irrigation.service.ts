import { apiRequest } from "@/services/api-client";
import type { IrrigationEstimate } from "@/types/irrigation";

export function getFieldIrrigation(fieldId: string) {
  return apiRequest<IrrigationEstimate>(`/api/fields/${fieldId}/irrigation`);
}
