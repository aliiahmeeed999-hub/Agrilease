import { cn } from "@/utils/cn";

function scoreColor(score: number) {
  if (score >= 70) return "bg-primary";
  if (score >= 40) return "bg-chart-3";
  return "bg-destructive/70";
}

export function FitScoreBar({ score, className }: { score: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", scoreColor(score))}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-end text-xs font-medium text-muted-foreground">{score}</span>
    </div>
  );
}
