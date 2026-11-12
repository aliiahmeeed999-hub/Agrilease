"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { isRtlLocale } from "@/i18n/routing";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { AdminAnalyticsSummary } from "@/types/admin";

// Same colours as the booking status badges everywhere else.
const STATUSES: { key: keyof AdminAnalyticsSummary["bookings"]["byStatus"]; color: string }[] = [
  { key: "PENDING", color: "var(--warning)" },
  { key: "APPROVED", color: "var(--success)" },
  { key: "REJECTED", color: "var(--destructive)" },
  { key: "CANCELLED", color: "var(--muted-foreground)" },
];

export function BookingFunnelChart({ byStatus }: { byStatus: AdminAnalyticsSummary["bookings"]["byStatus"] }) {
  const isRtl = isRtlLocale(useLocale());
  const tStatus = useTranslations("common.bookingStatus");
  const t = useTranslations("adminConsole");
  const data = STATUSES.map((s) => ({ label: tStatus(s.key), value: byStatus[s.key], color: s.color }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 24, right: isRtl ? -16 : 8, left: isRtl ? 8 : -16, bottom: 0 }}>
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
                const d = payload[0]?.payload as { label: string; value: number };
                if (!d) return [];
                return [{ label: d.label, value: t("bookingsCount", { count: d.value }) }];
              }}
            />
          )}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.color} />
          ))}
          <LabelList dataKey="value" position="top" fill="var(--foreground)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
