import { User as UserIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useSuspendUserAction } from "@/features/admin/hooks/useSuspendUserAction";
import { useChangeUserRoleAction } from "@/features/admin/hooks/useChangeUserRoleAction";
import { useVerifyUserAction } from "@/features/admin/hooks/useVerifyUserAction";
import { ROLE_LABEL_KEY } from "@/utils/role-labels";
import type { AdminUserListItem } from "@/types/admin";
import type { Role } from "@/generated/prisma/enums";

const ROLE_OPTIONS: Role[] = ["FARMER", "RENTAL_OWNER", "BANKER", "ADMIN"];

export function AdminUserRow({ item }: { item: AdminUserListItem }) {
  const tAuth = useTranslations("auth");
  const tAdmin = useTranslations("adminConsole");
  const tVerification = useTranslations("common.verificationStatus");
  const format = useFormatter();
  const now = useNow();
  const { data: currentUser } = useCurrentUser();
  const { act, pendingId, error } = useSuspendUserAction();
  const { act: changeRole, pendingId: roleChangePendingId } = useChangeUserRoleAction();
  const { act: setVerification, pendingId: verifyPendingId } = useVerifyUserAction();
  const isSubmitting = pendingId === item.id;

  const isSelf = currentUser?.user.id === item.id;
  const isAdmin = item.role === "ADMIN";
  const disableActions = isSelf || isAdmin;
  const disableReason = isSelf
    ? "You can't modify your own account"
    : isAdmin
      ? "Admin accounts can't be modified by other admins"
      : undefined;

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <UserIcon className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{item.fullName}</p>
            <p className="text-xs text-muted-foreground">{item.email}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline">{tAuth(ROLE_LABEL_KEY[item.role])}</Badge>
          {item.isSuspended && <Badge variant="destructive">{tAdmin("suspended")}</Badge>}
          {item.verificationStatus !== "UNVERIFIED" && (
            <Badge variant={item.verificationStatus === "VERIFIED" ? "default" : "outline"}>
              {tVerification(item.verificationStatus)}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {item.phone && <span>{item.phone}</span>}
        {item.region && <span>{item.region}</span>}
        <span>joined {format.relativeTime(new Date(item.createdAt), now)}</span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{item.farmsOwned} farms</span>
        <span>{item.equipmentOwned} equipment</span>
        <span>{item.bookingsAsRenter} bookings</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select
          value={item.role}
          onValueChange={(value) => changeRole(item.id, value as Role)}
          disabled={disableActions || roleChangePendingId === item.id}
        >
          <SelectTrigger size="sm" className="h-8 w-auto rounded-lg text-xs" title={disableReason}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role} value={role}>
                {tAuth(ROLE_LABEL_KEY[role])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          disabled={disableActions || verifyPendingId === item.id}
          title={disableReason}
          onClick={() => setVerification(item.id, item.verificationStatus === "VERIFIED" ? "UNVERIFIED" : "VERIFIED")}
        >
          {item.verificationStatus === "VERIFIED" ? tAdmin("unverify") : tAdmin("verify")}
        </Button>

        <Button
          size="sm"
          variant={item.isSuspended ? "outline" : "destructive"}
          disabled={disableActions || isSubmitting}
          title={disableReason}
          onClick={() => act(item.id, !item.isSuspended)}
        >
          {isSubmitting ? "Saving..." : item.isSuspended ? tAdmin("reactivate") : tAdmin("suspend")}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </Card>
  );
}
