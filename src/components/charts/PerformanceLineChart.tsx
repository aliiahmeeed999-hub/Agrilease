"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useLocale } from "next-intl";
import { isRtlLocale } from "@/i18n/routing";
import { ChartTooltip } from "./ChartTooltip";
import { formatDayLabel } from "@/utils/format";
import type { EquipmentPerformanceSampleDto } from "@/types/equipment";

export function PerformanceLineChart({ samples }: { samples: EquipmentPerformanceSampleDto[] }) {
  const locale = useLocale();
  const isRtl = isRtlLocale(locale);
  const data = samples.map((s) => ({ ...s, label: formatDayLabel(s.date, locale) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: isRtl ? -16 : 8, left: isRtl ? 8 : -16, bottom: 0 }}>
        <defs>
          <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.03} />
          </linearGradient>
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
          width={36}
          tickFormatter={(v: number) => `${v}km`}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-1)", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={(props) => (
            <ChartTooltip
              {...props}
              rows={(payload) => {
                const d = payload[0]?.payload as EquipmentPerformanceSampleDto & { label: string };
                if (!d) return [];
                return [
                  { label: "Distance", value: `${d.distanceKm} km` },
                  { label: "Running hours", value: `${d.runningHours}h` },
                  { label: "Tasks completed", value: `${d.tasksCompleted}` },
                  { label: "Efficiency", value: `${Math.round(d.efficiencyScore)}%` },
                ];
              }}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="distanceKm"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#performanceGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--background)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
