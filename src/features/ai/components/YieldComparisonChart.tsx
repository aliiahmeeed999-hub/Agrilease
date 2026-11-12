"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { useLocale } from "next-intl";
import { isRtlLocale } from "@/i18n/routing";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { YieldPrediction } from "@/types/ai";

export function YieldComparisonChart({ predictions }: { predictions: YieldPrediction[] }) {
  const isRtl = isRtlLocale(useLocale());
  const data = predictions.map((p) => ({
    label: p.fieldName,
    predicted: p.predictedTotalTons,
    prior: p.priorSeasonTotalTons,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
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
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          content={(props) => (
            <ChartTooltip
              {...props}
              rows={(payload) => {
                const d = payload[0]?.payload as { predicted: number; prior: number };
                if (!d) return [];
                return [
                  { label: "Predicted", value: `${d.predicted}t` },
                  { label: "Prior season", value: `${d.prior}t` },
                ];
              }}
            />
          )}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        <Bar dataKey="prior" name="Prior season" fill="var(--muted)" radius={[8, 8, 0, 0]} maxBarSize={28} />
        <Bar dataKey="predicted" name="Predicted" fill="url(#yieldGradient)" radius={[8, 8, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
