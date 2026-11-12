import { useFormatter, useTranslations } from "next-intl";

const STEPS = [
  { titleKey: "step1Title", descriptionKey: "step1Description" },
  { titleKey: "step2Title", descriptionKey: "step2Description" },
  { titleKey: "step3Title", descriptionKey: "step3Description" },
] as const;

// Not three identical cards: a short ruled list, like steps written in a
// notebook, with the heading held to one side on wide screens.
export function HowItWorks() {
  const t = useTranslations("marketing.howItWorks");
  const tNav = useTranslations("marketing.nav");
  const format = useFormatter();

  return (
    <section id="how-it-works" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-28">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-28">
          <p className="text-sm font-medium text-terracotta">{tNav("howItWorks")}</p>
          <h2 className="type-title-display-2 mt-3 text-foreground">{t("title")}</h2>
        </div>
      </div>

      <ol className="lg:col-span-7 lg:col-start-6">
        {STEPS.map((step, i) => (
          <li key={step.titleKey} className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-border py-8 first:border-t-0 first:pt-0 sm:grid-cols-[5rem_1fr]">
            <span
              aria-hidden="true"
              className="font-[family-name:var(--font-display)] text-5xl leading-none text-terracotta sm:text-6xl"
              style={{ fontVariationSettings: '"SOFT" 100, "opsz" 144' }}
            >
              {format.number(i + 1)}
            </span>
            <div>
              <h3 className="type-title-2 text-foreground">{t(step.titleKey)}</h3>
              <p className="mt-2 max-w-lg text-base leading-relaxed text-muted-foreground">{t(step.descriptionKey)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
