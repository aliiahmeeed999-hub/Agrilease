import { useQuery } from "@tanstack/react-query";
import { getDemandForecast } from "@/services/ai.service";

export function useDemandForecast() {
  return useQuery({
    queryKey: ["ai", "forecast"],
    queryFn: getDemandForecast,
  });
}
