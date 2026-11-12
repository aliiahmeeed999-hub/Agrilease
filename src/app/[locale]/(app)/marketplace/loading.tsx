import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-2.5 sm:mb-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-80" />
      </div>
      <Skeleton className="mb-6 h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </PageShell>
  );
}
