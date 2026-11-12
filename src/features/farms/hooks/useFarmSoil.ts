import { useQuery } from "@tanstack/react-query";
import { getFarmSoil } from "@/services/soil.service";

export function useFarmSoil(farmId: string | undefined) {
  return useQuery({
    queryKey: ["farms", "soil", farmId],
    queryFn: () => getFarmSoil(farmId!),
    enabled: Boolean(farmId),
    // Soil composition is cached server-side for 30 days (see src/lib/soil.ts).
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
