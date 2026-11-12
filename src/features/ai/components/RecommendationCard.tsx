import { AlertTriangle, Tractor } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FitScoreBar } from "@/features/ai/components/FitScoreBar";
import { TASK_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import type { TaskRecommendation } from "@/types/ai";

export function RecommendationCard({ recommendation }: { recommendation: TaskRecommendation }) {
  const top = recommendation.recommendations.slice(0, 3);

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{recommendation.taskTitle}</p>
          {recommendation.fieldName && (
            <p className="text-xs text-muted-foreground">{recommendation.fieldName}</p>
          )}
        </div>
        <Badge className={STATUS_STYLE[recommendation.status] ?? ""}>
          {recommendation.status.toLowerCase().replace("_", " ")}
        </Badge>
      </div>

      {recommendation.noIdealMatchInFleet && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>No ideal equipment type for this task is currently in your fleet.</span>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {top.length === 0 ? (
          <p className="text-xs text-muted-foreground">No equipment available to recommend.</p>
        ) : (
          top.map((fit) => (
            <div key={fit.equipmentId} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Tractor className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium">{fit.equipmentName}</span>
                </div>
              </div>
              <FitScoreBar score={fit.fitScore} className="mt-2" />
              <ul className="mt-2 flex flex-col gap-1">
                {fit.reasoning.map((line) => (
                  <li key={line} className="text-xs text-muted-foreground">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
