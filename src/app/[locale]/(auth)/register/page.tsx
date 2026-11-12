import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { AuthShell } from "@/features/auth/components/AuthShell";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <AuthShell
      title={t("createAccountHeading")}
      subtitle={t("createAccountSubtitle")}
      footer={
        <p>
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
