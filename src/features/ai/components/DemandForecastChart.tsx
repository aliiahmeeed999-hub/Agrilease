"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { useLocale } from "next-intl";
import { isRtlLocale } from "@/i18n/routing";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatDayLabel } from "@/utils/format";
import type { WeeklyDemand } from "@/types/ai";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const TYPE_LABEL: Record<string, string> = {
  TRACTOR: "Tractor",
  HARVESTER: "Harvester",
  SPRAYER: "Sprayer",
  PLOW: "Plow",
  TRAILER: "Trailer",
  IRRIGATION_PUMP: "Irrigation pump",
};

const EQUIPMENT_TYPES = ["TRACTOR", "HARVESTER", "SPRAYER", "PLOW", "TRAILER", "IRRIGATION_PUMP"] as const;

export function DemandForecastChart({ weeks }: { weeks: WeeklyDemand[] }) {
  const locale = useLocale();
  const isRtl = isRtlLocale(locale);
  const totals = EQUIPMENT_TYPES.map((type) => ({
    type,
    total: weeks.reduce((sum, w) => sum + (w[type] ?? 0), 0),
  })).filter((t) => t.total > 0);

  const sorted = [...totals].sort((a, b) => b.total - a.total);
  const keepTypes = sorted.slice(0, 5).map((t) => t.type);
  const foldedTypes = sorted.slice(5).map((t) => t.type);

  const data = weeks.map((week) => {
    const row: Record<string, number | string> = { label: formatDayLabel(week.weekStart, locale) };
    for (const type of keepTypes) row[type] = week[type] ?? 0;
    if (foldedTypes.length > 0) {
      row.OTHER = foldedTypes.reduce((sum, type) => sum + (week[type] ?? 0), 0);
    }
    return row;
  });

  const series = [...keepTypes, ...(foldedTypes.length > 0 ? ["OTHER"] : [])];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((type, i) => (
            <linearGradient key={type} id={`forecastGradient-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.7} />
              <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.08} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          reversed={isRtl}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          orientation={isRtl ? "right" : "left"}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          width={40}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltip
              {...props}
              rows={(payload) => {
                const row = payload[0]?.payload as Record<string, number | string> | undefined;
                if (!row) return [];
                return series.map((type) => ({
                  label: TYPE_LABEL[type] ?? "Other",
                  value: `${(row[type] as number).toFixed(1)}h`,
                }));
              }}
            />
          )}
        />
        <Legend
          formatter={(value) => TYPE_LABEL[value] ?? "Other"}
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
        {series.map((type, i) => (
          <Area
            key={type}
            type="monotone"
            dataKey={type}
            name={type}
            stackId="1"
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#forecastGradient-${type})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
