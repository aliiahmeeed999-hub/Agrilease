import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/cn";

// Asymmetric on purpose: the words get the wider column and start the page;
// the photograph sits beside them like a print pinned to a notebook page,
// with a caption, instead of being a full-bleed backdrop under a scrim.
export function Hero() {
  const t = useTranslations("marketing.hero");
  const tNav = useTranslations("marketing.nav");

  const facts = [t("factLanguages"), t("factCurrency"), t("factFinancing")];

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:pt-20 lg:pb-24">
      <div className="lg:col-span-7 lg:pt-6">
        <p className="text-sm font-medium text-terracotta">{t("eyebrow")}</p>
        <h1 className="type-display mt-5 max-w-[14ch] text-foreground">{t("title")}</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
            {t("cta")}
            <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center text-base font-medium text-foreground underline decoration-foreground/30 underline-offset-[6px] transition-colors hover:decoration-foreground"
          >
            {tNav("signIn")}
          </Link>
        </div>

        {/* Three plain facts instead of animated vanity numbers. */}
        <ul className="mt-10 flex flex-col gap-2.5 border-t border-border pt-6 text-sm text-foreground sm:flex-row sm:flex-wrap sm:gap-x-8">
          {facts.map((fact) => (
            <li key={fact} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      </div>

      <figure className="lg:col-span-5">
        <div className="relative">
          {/* Furrow strip offset behind the photo: the signature motif. */}
          <div aria-hidden="true" className="bg-furrows absolute -inset-x-3 top-6 -bottom-3 rounded-2xl sm:-inset-x-4 lg:-end-5 lg:-start-0" />
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted lg:aspect-[4/5]">
            <Image
              src="/generated/landing/hero-poster.webp"
              alt={t("imageAlt")}
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
        <figcaption className="mt-5 text-sm text-muted-foreground italic">{t("photoCaption")}</figcaption>
      </figure>
    </section>
  );
}
