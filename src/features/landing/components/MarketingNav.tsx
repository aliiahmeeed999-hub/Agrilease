import { Sprout } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

// Plain anchor links: the browser scrolls (smoothly, unless the visitor asked
// for reduced motion), the URL updates, and the back button works.
export function MarketingNav() {
  const t = useTranslations("marketing.nav");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="size-4.5" aria-hidden="true" />
          </span>
          <span dir="ltr">agriLease</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="#for-owners" className="flex h-10 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("forOwners")}
          </a>
          <a href="#how-it-works" className="flex h-10 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("howItWorks")}
          </a>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="hidden h-10 items-center px-3 text-sm font-medium text-foreground transition-colors hover:text-primary sm:flex"
          >
            {t("signIn")}
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
