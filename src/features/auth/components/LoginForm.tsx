"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, FormError, fieldMessageId } from "@/components/ui/field";
import { login } from "@/services/auth.service";
import { ApiError } from "@/services/api-client";
import { ROLE_HOME } from "@/lib/constants";

function useLoginSchema() {
  const t = useTranslations("auth.validation");
  return z.object({
    email: z.string().email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
  });
}

type LoginFormValues = { email: string; password: string };

export function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginSchema = useLoginSchema();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const { user } = await login(values.email, values.password);
      queryClient.setQueryData(["auth", "me"], { user });
      router.push(ROLE_HOME[user.role]);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
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
          placeholder="farmer@agrilease.ma"
          aria-invalid={!!errors.email}
          aria-describedby={fieldMessageId("email")}
          {...register("email")}
        />
      </Field>

      <Field label={t("passwordLabel")} htmlFor="password" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={fieldMessageId("password")}
          {...register("password")}
        />
      </Field>

      <FormError>{serverError}</FormError>

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
