import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, ProfileLink } from "@/features/profile/components/ProfileShared";
import type { RentalOwnerProfileDto } from "@/types/profile";

export function RentalOwnerProfileView({ profile }: { profile: RentalOwnerProfileDto }) {
  const t = useTranslations("profile");
  const tVerification = useTranslations("common.verificationStatus");
  const format = useFormatter();

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
          <Field
            label={t("accountTypeLabel")}
            value={profile.accountType === "COMPANY" ? t("accountTypeCompany") : t("accountTypeIndividual")}
          />
          {profile.accountType === "COMPANY" && (
            <>
              <Field label={t("companyNameLabel")} value={profile.companyName} />
              <Field label={t("companyRegNumberLabel")} value={profile.companyRegNumber} />
              <Field label={t("addressLabel")} value={profile.address} />
            </>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{t("listingsCount", { count: profile.listingsCount })}</span>
          <span>
            {profile.averageRating !== null
              ? t("averageRating", { rating: format.number(profile.averageRating), count: profile.reviewCount })
              : t("noRatingsYet")}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProfileLink href="/owner/listings" label={t("myListingsTab")} />
        <ProfileLink href="/owner/bookings" label={t("rentalRequestsTab")} />
        <ProfileLink href="/owner/sale-offers" label={t("saleOffersTab")} />
      </div>
    </div>
  );
}
