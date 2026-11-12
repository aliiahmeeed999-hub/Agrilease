"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { updateProfile } from "@/services/profile.service";
import { ApiError } from "@/services/api-client";

const bankerProfileSchema = z.object({
  institutionName: z.string().min(2),
  region: z.string().min(2).optional(),
});

type BankerProfileFormValues = z.infer<typeof bankerProfileSchema>;

export function CreateBankerProfileForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankerProfileFormValues>({ resolver: zodResolver(bankerProfileSchema) });

  async function onSubmit(values: BankerProfileFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await updateProfile({
        institutionName: values.institutionName,
        region: values.region,
        regionsCovered: values.region ? [values.region] : undefined,
      });
      router.push(redirectTo ?? "/banker");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="type-headline text-foreground">{t("settingsTab")}</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="institutionName">{t("institutionNameLabel")}</Label>
          <Input id="institutionName" {...register("institutionName")} />
          {errors.institutionName && <p className="text-xs text-destructive">{errors.institutionName.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="region">{t("regionsCoveredLabel")}</Label>
          <Input id="region" {...register("region")} />
        </div>

        {serverError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? tCommon("saving") : tCommon("save")}
        </Button>
      </form>
    </Card>
  );
}
