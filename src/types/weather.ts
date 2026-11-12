export interface WeatherSnapshot {
  temperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  rainfallMm: number | null;
  pressureHpa: number | null;
  rainProbabilityPct: number | null;
  isFrostRisk: boolean;
  isHeatRisk: boolean;
  fetchedAt: string;
  source: string;
  stale: boolean;
}
