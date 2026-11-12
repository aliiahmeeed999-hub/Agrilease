import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinancingLoading() {
  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-2.5 sm:mb-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </PageShell>
  );
}
