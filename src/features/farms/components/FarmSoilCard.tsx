"use client";

import { FlaskConical, Sprout } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarmSoil } from "@/features/farms/hooks/useFarmSoil";
import { ApiError } from "@/services/api-client";

// A reading: what it is, then the value. "—" when the source has no value.
function Stat({ icon: Icon, label, value }: { icon: typeof FlaskConical; label: string; value: string }) {
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

export function FarmSoilCard({ farmId }: { farmId: string }) {
  const t = useTranslations("farms");
  const locale = useLocale();
  const format = useFormatter();
  const { data, isPending, isError, error } = useFarmSoil(farmId);
  const na = "—";
  const n = (v: number, digits: number) => format.number(v, { maximumFractionDigits: digits, minimumFractionDigits: digits });

  return (
    <Card className="gap-0 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-headline text-foreground">{t("soilTitle")}</h2>
        {data?.stale && (
          <Badge variant="warning" title={t("staleHint")}>
            {t("showingCachedData")}
          </Badge>
        )}
      </div>

      {isPending && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-3 text-sm text-muted-foreground">
          {error instanceof ApiError && error.code === "SOIL_UNAVAILABLE" ? t("soilUnavailable") : t("couldNotLoadSoil")}
        </p>
      )}

      {data && data.ph === null && data.nitrogen === null && data.organicMatterPct === null && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("noSoilDataAtLocation")}</p>
      )}

      {data && (data.ph !== null || data.nitrogen !== null || data.organicMatterPct !== null) && (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <Stat icon={FlaskConical} label={t("ph")} value={data.ph !== null ? n(data.ph, 1) : na} />
          <Stat icon={Sprout} label={t("organicMatter")} value={data.organicMatterPct !== null ? `${n(data.organicMatterPct, 1)}%` : na} />
          <Stat icon={FlaskConical} label={t("nitrogen")} value={data.nitrogen !== null ? `${n(data.nitrogen, 2)} g/kg` : na} />
        </dl>
      )}

      {data && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("source", { source: data.source, date: new Date(data.fetchedAt).toLocaleDateString(locale) })}
        </p>
      )}
    </Card>
  );
}
