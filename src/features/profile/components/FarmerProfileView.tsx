import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, ProfileLink } from "@/features/profile/components/ProfileShared";
import type { FarmerProfileDto } from "@/types/profile";

export function FarmerProfileView({ profile }: { profile: FarmerProfileDto }) {
  const t = useTranslations("profile");
  const tVerification = useTranslations("common.verificationStatus");

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="type-headline text-foreground">{t("overview")}</h2>
          <Badge variant={profile.verificationStatus === "VERIFIED" ? "default" : "outline"}>
            {tVerification(profile.verificationStatus)}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("fullNameLabel")} value={profile.fullName} />
          <Field label={t("emailLabel")} value={profile.email} />
          <Field label={t("phoneLabel")} value={profile.phone} />
          <Field label={t("regionLabel")} value={profile.region} />
          <Field label={t("cinLabel")} value={profile.cin} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t("farmsCount", { count: profile.farmsCount })}</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProfileLink href="/transactions" label={t("myTransactionsTab")} />
        <ProfileLink href="/marketplace" label={t("borrowOrBuyTab")} />
        <ProfileLink href="/financing" label={t("financingRequestsTab")} />
      </div>
    </div>
  );
}
