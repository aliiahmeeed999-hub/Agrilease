"use client";

import { CloudRain, Droplets, Thermometer, Wind, Gauge, Snowflake, Flame } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CardState } from "@/components/states/CardState";
import { useFarmWeather } from "@/features/farms/hooks/useFarmWeather";
import { ApiError } from "@/services/api-client";
import { CARD_TIER_2 } from "@/utils/card-tiers";

// A reading: what it is, then the value. "—" when the source has no value.
function Stat({ icon: Icon, label, value }: { icon: typeof Thermometer; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
      <Icon className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs leading-snug text-muted-foreground">{label}</dt>
        <dd className="tabular text-base font-semibold text-foreground">{value}</dd>
      </div>
    </div>
  );
}

export function FarmWeatherCard({ farmId }: { farmId: string }) {
  const t = useTranslations("farms");
  const locale = useLocale();
  const format = useFormatter();
  const { data, isPending, isError, error, refetch } = useFarmWeather(farmId);
  const na = "—";
  const n = (v: number, digits = 0) => format.number(v, { maximumFractionDigits: digits, minimumFractionDigits: digits });

  return (
    <Card className={`gap-0 p-5 ${CARD_TIER_2}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-headline text-foreground">{t("weatherTitle")}</h2>
        {data?.stale && (
          <Badge variant="warning" title={t("staleHint")}>
            {t("showingCachedData")}
          </Badge>
        )}
      </div>

      {isPending && (
        <div className="mt-3">
          <CardState
            state="loading"
            loadingSkeleton={
              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            }
          />
        </div>
      )}

      {isError && (
        <div className="mt-3">
          <CardState
            state="error"
            title={t("couldNotLoadWeather")}
            description={
              error instanceof ApiError && error.code === "WEATHER_UNAVAILABLE" ? t("weatherUnavailable") : undefined
            }
            onRetry={() => refetch()}
          />
        </div>
      )}

      {data && (
        <>
          {/* A risk is the one thing that changes what the farmer does today,
              so it comes before the routine readings. */}
          {(data.isFrostRisk || data.isHeatRisk) && (
            <div role="status" className="mt-3 flex flex-col gap-2">
              {data.isFrostRisk && (
                <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive">
                  <Snowflake className="size-4 shrink-0" aria-hidden="true" /> {t("frostRiskToday")}
                </p>
              )}
              {data.isHeatRisk && (
                <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive">
                  <Flame className="size-4 shrink-0" aria-hidden="true" /> {t("heatRiskToday")}
                </p>
              )}
            </div>
          )}

          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Stat icon={Thermometer} label={t("temperature")} value={data.temperatureC !== null ? `${n(data.temperatureC, 1)}°C` : na} />
            <Stat icon={Droplets} label={t("humidity")} value={data.humidityPct !== null ? `${n(data.humidityPct)}%` : na} />
            <Stat icon={Wind} label={t("wind")} value={data.windSpeedKmh !== null ? `${n(data.windSpeedKmh, 1)} km/h` : na} />
            <Stat icon={CloudRain} label={t("rainChance")} value={data.rainProbabilityPct !== null ? `${n(data.rainProbabilityPct)}%` : na} />
            <Stat icon={Gauge} label={t("pressure")} value={data.pressureHpa !== null ? `${n(data.pressureHpa)} hPa` : na} />
            <Stat icon={CloudRain} label={t("rainfallNow")} value={data.rainfallMm !== null ? `${n(data.rainfallMm, 1)} mm` : na} />
          </dl>

          <p className="mt-3 text-xs text-muted-foreground">
            {t("source", { source: data.source, date: new Date(data.fetchedAt).toLocaleString(locale) })}
          </p>
        </>
      )}
    </Card>
  );
}
