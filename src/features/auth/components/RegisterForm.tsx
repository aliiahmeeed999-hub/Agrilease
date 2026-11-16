"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Sprout, Tractor, type LucideIcon } from "lucide-react";
import type { AppLocale } from "@/i18n/routing";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { register as registerUser } from "@/services/auth.service";
import { ApiError } from "@/services/api-client";

function useRegisterSchema() {
  const t = useTranslations("auth.validation");
  return z.object({
    fullName: z.string().min(2, t("fullNameMinLength")),
    email: z.string().email(t("emailInvalid")),
    password: z.string().min(8, t("passwordMinLength")),
    role: z.enum(["FARMER", "RENTAL_OWNER"]),
  });
}

// Banker and admin accounts are created by an admin, not by sign-up
// (see src/app/api/auth/register/route.ts).
type Role = "FARMER" | "RENTAL_OWNER";

type RegisterFormValues = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
};

const ROLES: { value: Role; icon: LucideIcon; labelKey: string; hintKey: string }[] = [
  { value: "FARMER", icon: Sprout, labelKey: "roleFarmer", hintKey: "roleFarmerHint" },
  { value: "RENTAL_OWNER", icon: Tractor, labelKey: "roleRentalOwner", hintKey: "roleRentalOwnerHint" },
];

export function RegisterForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registerSchema = useRegisterSchema();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "FARMER" },
  });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const { user } = await registerUser({ ...values, locale });
      queryClient.setQueryData(["auth", "me"], { user });
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Who you are decides everything after sign-up, so it comes first and
          each choice says in plain words what it is for. */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">{t("roleLabel")}</legend>
        <div className="flex flex-col gap-2">
          {ROLES.map(({ value, icon: Icon, labelKey, hintKey }) => (
            <label
              key={value}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 transition-colors has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" value={value} className="peer sr-only" {...register("role")} />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary/15 peer-checked:text-primary">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{t(labelKey)}</span>
                <span className="block text-sm leading-snug text-muted-foreground">{t(hintKey)}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("staffAccountsNote")}</p>
      </fieldset>

      <Field label={t("fullNameLabel")} htmlFor="fullName" error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          aria-describedby={fieldMessageId("fullName")}
          {...register("fullName")}
        />
      </Field>

      <Field label={t("emailLabel")} htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          dir="ltr"
          className="text-start"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={fieldMessageId("email")}
          {...register("email")}
        />
      </Field>

      <Field label={t("passwordLabel")} htmlFor="password" hint={t("passwordHint")} error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={fieldMessageId("password")}
          {...register("password")}
        />
      </Field>

      <FormError>{serverError}</FormError>

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? t("creatingAccount") : t("createAccount")}
      </Button>
    </form>
  );
}
