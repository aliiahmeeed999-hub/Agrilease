import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceDetailLoading() {
  return (
    <PageShell>
      <Skeleton className="mb-4 h-6 w-44" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </PageShell>
  );
}
