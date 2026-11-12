import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { AuthShell } from "@/features/auth/components/AuthShell";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <AuthShell
      title={t("signInHeading")}
      subtitle={t("signInSubtitle")}
      footer={
        <>
          <p>
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              {t("register")}
            </Link>
          </p>
          <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-relaxed">
            {t.rich("demoAccounts", {
              password: "Password123!",
              code: (chunks) => (
                <span dir="ltr" className="font-mono">
                  {chunks}
                </span>
              ),
            })}{" "}
            <span dir="ltr" className="font-mono">
              farmer@agrilease.ma
            </span>
          </p>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
