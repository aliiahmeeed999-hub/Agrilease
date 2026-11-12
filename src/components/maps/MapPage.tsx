"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useFarms } from "@/features/farms/hooks/useFarms";
import type { FarmListItem } from "@/types/farm";

// Frame for the full-page maps under /maps: page title, then the map once the
// farmer's farms are known (every map starts around them and measures
// distances from them).
export function MapPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (farms: FarmListItem[]) => ReactNode;
}) {
  const tFarms = useTranslations("farms");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useFarms();

  return (
    <PageShell>
      <PageHeader title={title} description={description} />
      {isPending && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
          <Skeleton className="h-[60dvh] min-h-[26rem] w-full rounded-xl sm:h-[34rem]" />
        </div>
      )}
      {isError && <ErrorState title={tFarms("couldNotLoadList")} description={tCommon("checkConnection")} onRetry={() => refetch()} />}
      {data && children(data.farms)}
    </PageShell>
  );
}
