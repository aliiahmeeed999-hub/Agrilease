import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinancingApplyLoading() {
  return (
    <PageShell className="max-w-4xl">
      <div className="mb-6 flex flex-col gap-2.5 sm:mb-8">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-80" />
      </div>
      <Skeleton className="h-[28rem] rounded-2xl" />
    </PageShell>
  );
}
