import { Link } from "@/i18n/navigation";
import { Sprout } from "lucide-react";
import { useTranslations } from "next-intl";

export function MarketingFooter() {
  const t = useTranslations("marketing.footer");
  const tNav = useTranslations("marketing.nav");
  const linkClass = "-mx-2 flex min-h-10 items-center rounded-lg px-2 text-foreground transition-colors hover:text-primary";

  return (
    <footer className="mt-auto bg-background">
      <div aria-hidden="true" className="rule-furrows" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="flex flex-col gap-3 md:col-span-6">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="size-4.5" aria-hidden="true" />
            </span>
            <span dir="ltr">agriLease</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("tagline")}</p>
        </div>

        <nav aria-label={t("productHeading")} className="flex flex-col text-sm md:col-span-3">
          <p className="mb-2 font-semibold text-muted-foreground">{t("productHeading")}</p>
          <Link href="/register" className={linkClass}>
            {tNav("getStarted")}
          </Link>
          <Link href="/login" className={linkClass}>
            {tNav("signIn")}
          </Link>
        </nav>
        <div className="flex flex-col text-sm md:col-span-3">
          <p className="mb-2 font-semibold text-muted-foreground">{t("rolesHeading")}</p>
          <span className="flex min-h-10 items-center text-foreground">{t("roleFarmers")}</span>
          <span className="flex min-h-10 items-center text-foreground">{t("roleOwners")}</span>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} <span dir="ltr">agriLease</span>. {t("rightsReserved")}
      </div>
    </footer>
  );
}
