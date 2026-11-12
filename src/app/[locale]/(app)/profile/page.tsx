"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { ProfileByRole } from "@/features/profile/components/ProfileByRole";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useProfile();

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </div>

      {isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data && <ProfileByRole profile={data} />}
    </PageShell>
  );
}
