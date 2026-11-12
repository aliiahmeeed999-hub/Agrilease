"use client";

import { useState } from "react";
import { Users, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminUsers } from "@/features/admin/hooks/useAdminUsers";
import { AdminUserRow } from "@/features/admin/components/AdminUserRow";
import { ROLE_LABEL_KEY } from "@/utils/role-labels";
import type { Role, VerificationStatus } from "@/generated/prisma/enums";

const ROLES: Role[] = ["FARMER", "RENTAL_OWNER", "BANKER", "ADMIN"];
const VERIFICATION_STATUSES: VerificationStatus[] = ["UNVERIFIED", "PENDING", "VERIFIED"];

export default function AdminUsersPage() {
  const t = useTranslations("adminConsole");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tVerification = useTranslations("common.verificationStatus");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | "ALL">("ALL");

  const { data, isPending, isError, refetch } = useAdminUsers({
    search: search.trim() || undefined,
    role: role === "ALL" ? undefined : role,
    verificationStatus: verificationStatus === "ALL" ? undefined : verificationStatus,
  });

  return (
    <PageShell>
      <PageHeader title={tCommon("nav.users")} description={t("usersSubtitle")} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={role} onValueChange={(v) => setRole(v as Role | "ALL")}>
          <SelectTrigger size="sm" className="w-full sm:w-44">
            <SelectValue placeholder={t("roleFilterLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allRoles")}</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {tAuth(ROLE_LABEL_KEY[r])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={verificationStatus} onValueChange={(v) => setVerificationStatus(v as VerificationStatus | "ALL")}>
          <SelectTrigger size="sm" className="w-full sm:w-44">
            <SelectValue placeholder={t("verificationFilterLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
            {VERIFICATION_STATUSES.map((v) => (
              <SelectItem key={v} value={v}>
                {tVerification(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title="Couldn't load users"
          description={tCommon("checkConnection")}
          onRetry={() => refetch()}
        />
      )}

      {data && data.users.length === 0 && (
        <EmptyState icon={Users} title={t("noUsersMatchFilters")} description="Try adjusting your search or filters." />
      )}

      {data && data.users.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.users.map((item) => (
            <AdminUserRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
