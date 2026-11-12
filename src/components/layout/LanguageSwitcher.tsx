"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateLanguage } from "@/services/auth.service";
import { cn } from "@/utils/cn";

const LANGUAGE_LABEL_KEY: Record<AppLocale, "languageEnglish" | "languageFrench" | "languageArabic"> = {
  en: "languageEnglish",
  fr: "languageFrench",
  ar: "languageArabic",
};

// Accepts an optional isAuthenticated flag rather than a full user object -
// this switcher is also rendered on (marketing)/(auth) layouts where no
// session exists yet, and persisting server-side only makes sense once
// there's a user row to persist it against (next-intl's own NEXT_LOCALE
// cookie handles the logged-out case via router.replace below).
export function LanguageSwitcher({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
    if (isAuthenticated) {
      updateLanguage(nextLocale).catch(() => {});
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        aria-label={t("language")}
      >
        <Globe className="size-4.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t(LANGUAGE_LABEL_KEY[locale])}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {routing.locales.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => handleSelect(option)}
            aria-current={option === locale ? "true" : undefined}
            className={cn("justify-between", option === locale && "font-semibold")}
          >
            {/* Each language is written in its own script, so it reads
                correctly whatever the current interface language is. */}
            <span lang={option}>{t(LANGUAGE_LABEL_KEY[option])}</span>
            {option === locale && <Check className="size-4 text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
