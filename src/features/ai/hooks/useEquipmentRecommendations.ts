import { useQuery } from "@tanstack/react-query";
import { getEquipmentRecommendations } from "@/services/ai.service";

export function useEquipmentRecommendations() {
  return useQuery({
    queryKey: ["ai", "recommendations"],
    queryFn: getEquipmentRecommendations,
  });
}
