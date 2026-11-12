import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinancingSimulateLoading() {
  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-2.5 sm:mb-8">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-80" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </PageShell>
  );
}
