import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/utils/cn";

// A full-width olive band rather than another centred card: the one place on
// the page where the action colour fills the space.
export function FinalCta() {
  const t = useTranslations("marketing.finalCta");

  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div aria-hidden="true" className="absolute inset-y-0 end-0 w-1/3 opacity-40 [background-image:repeating-linear-gradient(-62deg,color-mix(in_oklch,var(--primary-foreground)_30%,transparent)_0_1px,transparent_1px_7px)] max-md:hidden" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="type-title-display-2">{t("title")}</h2>
          <p className="mt-4 text-lg leading-relaxed text-primary-foreground/85">{t("subtitle")}</p>
        </div>
        <Link
          href="/register"
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-foreground px-6 text-base font-semibold text-primary transition-[background-color,scale] duration-150 hover:bg-primary-foreground/90 active:scale-[0.97] active:duration-75"
          )}
        >
          {t("cta")}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
