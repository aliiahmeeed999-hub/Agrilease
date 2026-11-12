import { useQuery } from "@tanstack/react-query";
import { getFarmWeather } from "@/services/weather.service";

export function useFarmWeather(farmId: string | undefined) {
  return useQuery({
    queryKey: ["farms", "weather", farmId],
    queryFn: () => getFarmWeather(farmId!),
    enabled: Boolean(farmId),
    // Current conditions are already cached server-side for an hour (see
    // src/lib/weather.ts) - re-fetching more often than that from the client
    // would just re-read the same cached row.
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
