import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function EquipmentDetailLoading() {
  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-48 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </PageShell>
  );
}
