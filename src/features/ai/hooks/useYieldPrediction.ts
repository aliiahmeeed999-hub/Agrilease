import { useQuery } from "@tanstack/react-query";
import { getYieldPredictions } from "@/services/ai.service";

export function useYieldPrediction() {
  return useQuery({
    queryKey: ["ai", "yield"],
    queryFn: getYieldPredictions,
  });
}
