import { ArrowDownRight, ArrowUpRight, Wheat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { YieldPrediction } from "@/types/ai";

const CONFIDENCE_STYLE: Record<YieldPrediction["confidenceLevel"], string> = {
  HIGH: "bg-primary/15 text-primary",
  MEDIUM: "bg-muted text-muted-foreground",
  LOW: "bg-muted text-muted-foreground/60",
};

function cropLabel(cropType: string) {
  return cropType.charAt(0) + cropType.slice(1).toLowerCase();
}

export function YieldFieldCard({ prediction }: { prediction: YieldPrediction }) {
  const isUp = prediction.trendPct >= 0;

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Wheat className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{prediction.fieldName}</p>
            <p className="text-xs text-muted-foreground">
              {cropLabel(prediction.cropType)} · {prediction.areaHectares} ha
            </p>
          </div>
        </div>
        <Badge className={CONFIDENCE_STYLE[prediction.confidenceLevel]}>
          {prediction.confidenceLevel.toLowerCase()} confidence
        </Badge>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight">{prediction.predictedTotalTons}t</p>
          <p className="text-xs text-muted-foreground">
            {prediction.predictedPerHectare}t/ha · range {prediction.confidenceRangeTons[0]}–
            {prediction.confidenceRangeTons[1]}t
          </p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${isUp ? "text-primary" : "text-destructive"}`}>
          {isUp ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
          {Math.abs(prediction.trendPct)}%
        </div>
      </div>

      {prediction.daysToHarvest !== null && (
        <p className="mt-3 text-xs text-muted-foreground">
          {prediction.daysToHarvest > 0
            ? `${prediction.daysToHarvest} days to expected harvest`
            : "Harvest window has passed"}
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground/70">
        {prediction.modelBacked
          ? "Trained model, fed this field's recent climate (see model card)"
          : "Estimate only - no trained model for this crop or climate data unavailable"}
      </p>
    </Card>
  );
}
