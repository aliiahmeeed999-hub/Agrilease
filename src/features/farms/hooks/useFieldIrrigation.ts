import { useQuery } from "@tanstack/react-query";
import { getFieldIrrigation } from "@/services/irrigation.service";

export function useFieldIrrigation(fieldId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["fields", "irrigation", fieldId],
    queryFn: () => getFieldIrrigation(fieldId),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
