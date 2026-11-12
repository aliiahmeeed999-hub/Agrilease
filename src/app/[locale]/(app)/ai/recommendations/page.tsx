"use client";

import { Tractor } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Reveal } from "@/components/motion/Reveal";
import { useEquipmentRecommendations } from "@/features/ai/hooks/useEquipmentRecommendations";
import { RecommendationCard } from "@/features/ai/components/RecommendationCard";

function RecommendationsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}

export default function RecommendationsPage() {
  const { data, isPending, isError, refetch } = useEquipmentRecommendations();

  const hasAny = data && (data.upcoming.length > 0 || data.completedReview.length > 0);

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Equipment recommendations</h1>
        <p className="text-sm text-muted-foreground">
          Best-fit equipment for your upcoming tasks, based on implement type, availability, and power.
        </p>
      </div>

      {isPending && <RecommendationsSkeleton />}

      {isError && (
        <ErrorState
          title="Couldn't load recommendations"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {data && !hasAny && (
        <EmptyState
          icon={Tractor}
          title="No tasks to recommend equipment for yet"
          description="Once you schedule tasks on your farm, recommendations will show up here."
        />
      )}

      {data && hasAny && (
        <div className="flex flex-col gap-8">
          {data.upcoming.length > 0 && (
            <div>
              <h2 className="mb-4 type-headline text-foreground">Upcoming &amp; active tasks</h2>
              <Reveal className="grid grid-cols-1 gap-4 lg:grid-cols-2" stagger={0.08}>
                {data.upcoming.map((rec) => (
                  <RecommendationCard key={rec.taskId} recommendation={rec} />
                ))}
              </Reveal>
            </div>
          )}

          {data.completedReview.length > 0 && (
            <div>
              <h2 className="mb-4 type-headline text-foreground">Completed — fit review</h2>
              <Reveal className="grid grid-cols-1 gap-4 lg:grid-cols-2" stagger={0.08}>
                {data.completedReview.map((rec) => (
                  <RecommendationCard key={rec.taskId} recommendation={rec} />
                ))}
              </Reveal>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
