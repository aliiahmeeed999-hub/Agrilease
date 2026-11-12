"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Field, ProfileLink } from "@/features/profile/components/ProfileShared";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import type { BankerProfileDto } from "@/types/profile";

export function BankerProfileView({ profile }: { profile: BankerProfileDto }) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { save, isSubmitting, error } = useUpdateProfile();

  const [institutionName, setInstitutionName] = useState(profile.institutionName);
  const [defaultInterestRateText, setDefaultInterestRateText] = useState(profile.defaultInterestRateText ?? "");
  const [defaultTermsText, setDefaultTermsText] = useState(profile.defaultTermsText ?? "");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(false);
    const ok = await save({
      institutionName,
      defaultInterestRateText: defaultInterestRateText.trim() || null,
      defaultTermsText: defaultTermsText.trim() || null,
    });
    if (ok) setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl p-5">
        <h2 className="type-headline text-foreground">{t("overview")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t("statsPending")} value={profile.stats.pendingCount} />
          <StatTile label={t("statsApprovedThisMonth")} value={profile.stats.approvedThisMonthCount} />
          <StatTile label={t("statsRejectedThisMonth")} value={profile.stats.rejectedThisMonthCount} />
          <StatTile label={t("statsTotalFinanced")} value={format.number(profile.stats.totalFinancedMad)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProfileLink href="/banker/financing" label={t("financingRequestsTab")} />
        <ProfileLink href="/banker/loans" label={t("approvedLoansTab")} />
      </div>

      <Card className="rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="type-headline text-foreground">{t("settingsTab")}</h2>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("fullNameLabel")} value={profile.fullName} />
            <Field label={t("emailLabel")} value={profile.email} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="institutionName">{t("institutionNameLabel")}</Label>
            <Input
              id="institutionName"
              value={institutionName}
              onChange={(e) => {
                setInstitutionName(e.target.value);
                setSaved(false);
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultInterestRateText">{t("defaultInterestRateLabel")}</Label>
            <Input
              id="defaultInterestRateText"
              value={defaultInterestRateText}
              onChange={(e) => {
                setDefaultInterestRateText(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. 5.5%"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultTermsText">{t("defaultTermsLabel")}</Label>
            <Input
              id="defaultTermsText"
              value={defaultTermsText}
              onChange={(e) => {
                setDefaultTermsText(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. 12-24 months"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {saved && !error && <p className="text-xs text-primary">{t("saved")}</p>}

          <Button size="sm" className="w-fit" disabled={isSubmitting} onClick={handleSave}>
            {isSubmitting ? tCommon("saving") : tCommon("saveChanges")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
