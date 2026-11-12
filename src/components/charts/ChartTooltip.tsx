import type { TooltipContentProps } from "recharts";

type Row = { label: string; value: string };

export function ChartTooltip({
  active,
  label,
  payload,
  rows,
}: TooltipContentProps & {
  rows: (payload: TooltipContentProps["payload"]) => Row[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1 font-medium text-popover-foreground">{label}</p>}
      <div className="flex flex-col gap-0.5">
        {rows(payload).map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span>{row.label}</span>
            <span className="font-medium text-popover-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
