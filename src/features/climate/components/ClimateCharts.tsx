"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { isRtlLocale } from "@/i18n/routing";
import type { ClimateSeries, ClimateVariable } from "@/types/geodata";

export interface PlaceSeries {
  label: string; // "A", "B", "C"
  color: string;
  series: ClimateSeries;
}

// Rows keyed by period with one column per place and variable ("A:T2M").
function mergeRows(places: PlaceSeries[]) {
  const byPeriod = new Map<string, Record<string, number | string | null>>();
  for (const p of places) {
    for (const row of p.series.rows) {
      const target = byPeriod.get(row.period) ?? { period: row.period };
      for (const [k, v] of Object.entries(row)) if (k !== "period") target[`${p.label}:${k}`] = v as number | null;
      byPeriod.set(row.period, target);
    }
  }
  return [...byPeriod.values()];
}

function ChartCard({ title, unit, children }: { title: string; unit: string; children: React.ReactNode }) {
  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="type-headline text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </figcaption>
      {children}
    </figure>
  );
}

export function ClimateCharts({ places }: { places: PlaceSeries[] }) {
  const t = useTranslations("climateMap");
  const format = useFormatter();
  const rtl = isRtlLocale(useLocale());
  const rows = useMemo(() => mergeRows(places), [places]);
  const units = places[0]?.series.units;
  const single = places.length === 1;
  if (!units) return null;

  const axisCommon = {
    tickLine: false,
    axisLine: false,
    tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  } as const;
  const margin = { top: 8, right: rtl ? -8 : 8, left: rtl ? 8 : -8, bottom: 0 };
  const xAxis = <XAxis dataKey="period" reversed={rtl} minTickGap={24} {...axisCommon} />;
  const yAxis = <YAxis orientation={rtl ? "right" : "left"} width={40} {...axisCommon} />;
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />;
  const tooltip = (unit: string) => (
    <Tooltip
      cursor={{ stroke: "var(--border)" }}
      content={(props) => (
        <ChartTooltip
          {...props}
          rows={(payload) =>
            payload.map((p) => ({
              label: String(p.name),
              value: typeof p.value === "number" ? `${format.number(p.value, { maximumFractionDigits: 1 })} ${unit}` : "—",
            }))
          }
        />
      )}
    />
  );

  const lines = (variable: ClimateVariable, opts?: { dashed?: boolean; name?: (label: string) => string }) =>
    places.map((p) => (
      <Line
        key={`${p.label}-${variable}`}
        type="monotone"
        dataKey={`${p.label}:${variable}`}
        name={opts?.name ? opts.name(p.label) : t("place", { label: p.label })}
        stroke={p.color}
        strokeWidth={2}
        strokeDasharray={opts?.dashed ? "4 3" : undefined}
        dot={false}
        connectNulls={false}
        isAnimationActive={false}
      />
    ));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title={t("chartTemperature")} unit={units.T2M}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip(units.T2M)}
            {/* With one place, show the daily range around the mean. */}
            {single && lines("T2M_MAX", { dashed: true, name: () => t("var.T2M_MAX") })}
            {lines("T2M", single ? { name: () => t("var.T2M") } : undefined)}
            {single && lines("T2M_MIN", { dashed: true, name: () => t("var.T2M_MIN") })}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("chartPrecipitation")} unit={units.PRECTOTCORR}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip(units.PRECTOTCORR)}
            {places.map((p) => (
              <Bar key={p.label} dataKey={`${p.label}:PRECTOTCORR`} name={t("place", { label: p.label })} fill={p.color} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("chartSolar")} unit={units.ALLSKY_SFC_SW_DWN}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rows} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip(units.ALLSKY_SFC_SW_DWN)}
            {lines("ALLSKY_SFC_SW_DWN")}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("chartWindHumidity")} unit={`${units.WS2M} · ${units.RH2M}`}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rows} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip("")}
            {lines("WS2M", { name: (l) => `${t("var.WS2M")} (${l}, ${units.WS2M})` })}
            {lines("RH2M", { dashed: true, name: (l) => `${t("var.RH2M")} (${l}, ${units.RH2M})` })}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// The same numbers as text, for screen readers and anyone who wants exact values.
export function ClimateTable({ places }: { places: PlaceSeries[] }) {
  const t = useTranslations("climateMap");
  const format = useFormatter();
  const rows = useMemo(() => mergeRows(places).slice(0, 400), [places]);
  const units = places[0]?.series.units;
  if (!units) return null;
  const cols: ClimateVariable[] = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN"];
  const fmt = (v: unknown) => (typeof v === "number" ? format.number(v, { maximumFractionDigits: 1 }) : "—");

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">{t("tableToggle")}</summary>
      <div className="max-h-96 overflow-auto border-t border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="text-muted-foreground">
              <th scope="col" className="px-3 py-2 text-start font-medium">{t("period")}</th>
              {places.flatMap((p) =>
                cols.map((c) => (
                  <th key={`${p.label}-${c}`} scope="col" className="px-3 py-2 text-end font-medium whitespace-nowrap">
                    {p.label} · {t(`var.${c}`)} ({units[c]})
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.period)} className="border-t border-border">
                <th scope="row" className="px-3 py-1.5 text-start font-normal whitespace-nowrap" dir="ltr">
                  {String(r.period)}
                </th>
                {places.flatMap((p) =>
                  cols.map((c) => (
                    <td key={`${p.label}-${c}`} className="tabular px-3 py-1.5 text-end">
                      {fmt(r[`${p.label}:${c}`])}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
