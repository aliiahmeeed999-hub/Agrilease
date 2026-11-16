"use client";

import { Sprout } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Reveal } from "@/components/motion/Reveal";
import { useYieldPrediction } from "@/features/ai/hooks/useYieldPrediction";
import { YieldFieldCard } from "@/features/ai/components/YieldFieldCard";
import { YieldComparisonChart } from "@/features/ai/components/YieldComparisonChart";
import { AiSummary } from "@/features/ai/components/AiSummary";

function YieldSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

export default function YieldPredictionPage() {
  const { data, isPending, isError, refetch } = useYieldPrediction();

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Yield prediction</h1>
        <p className="text-sm text-muted-foreground">
          Estimated production for each active field, based on crop type, area, and season.
        </p>
      </div>

      {isPending && <YieldSkeleton />}

      {isError && (
        <ErrorState
          title="Couldn't load yield predictions"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {data && data.fields.length === 0 && (
        <EmptyState
          icon={Sprout}
          title="No active fields yet"
          description="Add a field to your farm to see yield predictions here."
        />
      )}

      {data && data.fields.length > 0 && (
        <div className="flex flex-col gap-6">
          <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
            {data.fields.map((prediction) => (
              <YieldFieldCard key={prediction.fieldId} prediction={prediction} />
            ))}
          </Reveal>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 type-headline text-foreground">Predicted vs. prior season</h2>
            <YieldComparisonChart predictions={data.fields} />
          </div>

          <AiSummary kind="yield" />
        </div>
      )}
    </PageShell>
  );
}
