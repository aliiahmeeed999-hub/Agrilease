import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Field, ProfileLink } from "@/features/profile/components/ProfileShared";
import type { AdminProfileDto } from "@/types/profile";

export function AdminProfileView({ profile }: { profile: AdminProfileDto }) {
  const t = useTranslations("profile");

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl p-5">
        <h2 className="type-headline text-foreground">{t("overview")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("fullNameLabel")} value={profile.fullName} />
          <Field label={t("emailLabel")} value={profile.email} />
          <Field label={t("adminLevelLabel")} value={profile.adminLevel} />
        </div>
      </Card>

      <ProfileLink href="/admin" label={t("adminConsoleLink")} />
    </div>
  );
}
