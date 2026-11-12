import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerCalendarLoading() {
  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Skeleton className="h-80 w-72 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </PageShell>
  );
}
