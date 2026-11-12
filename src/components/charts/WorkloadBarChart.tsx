"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useLocale } from "next-intl";
import { isRtlLocale } from "@/i18n/routing";
import { ChartTooltip } from "./ChartTooltip";
import { formatDayLabel } from "@/utils/format";
import type { DashboardWorkloadDay } from "@/types/dashboard";

export function WorkloadBarChart({ days }: { days: DashboardWorkloadDay[] }) {
  const locale = useLocale();
  const isRtl = isRtlLocale(locale);
  const data = days.map((d) => ({ ...d, label: formatDayLabel(d.date, locale) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: isRtl ? -16 : 8, left: isRtl ? 8 : -16, bottom: 0 }}>
        <defs>
          <linearGradient id="workloadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.35} />
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
          width={28}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          content={(props) => (
            <ChartTooltip
              {...props}
              rows={(payload) => {
                const d = payload[0]?.payload as DashboardWorkloadDay & { label: string };
                if (!d) return [];
                return [
                  { label: "Scheduled", value: `${d.tasksScheduled} tasks` },
                  { label: "Completed", value: `${d.tasksCompleted} tasks` },
                  { label: "Capacity", value: `${d.capacityHours}h` },
                ];
              }}
            />
          )}
        />
        <Bar dataKey="tasksScheduled" fill="url(#workloadGradient)" radius={[8, 8, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
