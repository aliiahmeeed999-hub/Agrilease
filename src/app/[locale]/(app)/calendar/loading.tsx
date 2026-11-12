import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Skeleton className="h-80 w-72 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </PageShell>
  );
}
