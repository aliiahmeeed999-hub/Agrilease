import type { ReactNode } from "react";
import { Sprout } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

// The frame shared by sign-in and sign-up: a way back to the public site, the
// language picker, then one centred card. Same layout for both, so moving
// between them never feels like leaving the product.
export async function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = await getTranslations("auth");
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <Link href="/" aria-label={t("backToHome")} className="flex min-h-11 items-center gap-2 rounded-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="size-4.5" aria-hidden="true" />
          </span>
          <span dir="ltr">agriLease</span>
        </Link>
        <LanguageSwitcher />
      </header>
      <div aria-hidden="true" className="rule-furrows" />

      <main id="main-content" className="flex flex-1 items-start justify-center px-4 pt-6 pb-12 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="type-title-1 text-foreground">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">{children}</div>
          {footer && <div className="mt-6 flex flex-col gap-3 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
