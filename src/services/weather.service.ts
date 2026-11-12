import { apiRequest } from "@/services/api-client";
import type { WeatherSnapshot } from "@/types/weather";

export function getFarmWeather(farmId: string) {
  return apiRequest<WeatherSnapshot>(`/api/farms/${farmId}/weather`);
}
