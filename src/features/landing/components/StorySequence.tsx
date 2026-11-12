"use client";

import { useRef, useState } from "react";
import type { ComponentType } from "react";
import { useGSAP } from "@gsap/react";
import {
  Sprout,
  Tractor,
  Landmark,
  AlertTriangle,
  Satellite,
  Clock,
  Route,
  CheckCircle2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/utils/cn";

type StoryKey = "forFarmers" | "forOwners" | "forFinancing";

interface Step {
  key: StoryKey;
  icon: ComponentType<{ className?: string }>;
  Preview: ComponentType;
}

/* ---------- Illustrative product previews ---------- */

const FIELDS = [
  { crop: "WHEAT", statusKey: "statusGrowing", progress: 62 },
  { crop: "BARLEY", statusKey: "statusHarvestWindow", progress: 88 },
  { crop: "OLIVES", statusKey: "statusFlowering", progress: 41 },
  { crop: "CITRUS", statusKey: "statusIrrigating", progress: 54 },
] as const;

const previewEyebrow = "type-overline text-muted-foreground";
const previewTile = "rounded-lg border border-border bg-background p-3";

function FieldsPreview() {
  const t = useTranslations("marketing.preview");
  const tCrop = useTranslations("common.crop");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={previewEyebrow}>{t("farm")}</p>
          <p className="font-semibold text-foreground">{t("farmName")}</p>
        </div>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          {t("fieldsCount", { count: FIELDS.length })}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {FIELDS.map((f) => (
          <li key={f.crop} className={previewTile}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{tCrop(f.crop)}</span>
              <span className="text-muted-foreground">{t(f.statusKey)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${f.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border/70 pt-4 text-sm">
        <span className="text-muted-foreground">{t("onDutyToday")}</span>
        <div className="flex -space-x-2 rtl:space-x-reverse" dir="ltr">
          {["YA", "KB", "SM"].map((i) => (
            <span
              key={i}
              className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-accent text-[11px] font-semibold text-accent-foreground"
            >
              {i}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EquipmentPreview() {
  const t = useTranslations("marketing.preview");
  const format = useFormatter();
  const stats = [
    { icon: Clock, label: t("runningHours"), value: `${format.number(1248)} h` },
    { icon: Route, label: t("distance"), value: `${format.number(312)} km` },
    { icon: CheckCircle2, label: t("tasksDone"), value: "8 / 10" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={previewEyebrow}>{t("tractor")}</p>
          <p className="font-semibold text-foreground" dir="ltr">
            John Deere 6R 155
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
          <span className="size-1.5 rounded-full bg-success" />
          {t("live")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={previewTile}>
            <s.icon className="size-4 text-primary" />
            <p className="tabular mt-2 text-base font-semibold text-foreground" dir="ltr">
              {s.value}
            </p>
            <p className="text-xs leading-tight text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <span className="text-foreground">{t("alertHydraulic")}</span>
        </li>
        <li className={cn(previewTile, "flex items-center gap-3 text-sm")}>
          <Satellite className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">{t("alertGps")}</span>
        </li>
      </ul>
    </div>
  );
}

// Illustrative figures computed with the same amortisation as the simulator
// (200,000 MAD over 36 months at each offer's indicative rate).
const OFFERS = [
  { name: "Crédit Agricole du Maroc", modeKey: "modeBank", monthly: 6039 },
  { name: "Banque Populaire", modeKey: "modeBank", monthly: 6103 },
  { name: "Tamwilcom", modeKey: "modePublic", monthly: 5994 },
] as const;

function FinancingPreview() {
  const t = useTranslations("marketing.preview");
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={previewEyebrow}>{t("offer")}</p>
        <p className="font-semibold text-foreground">{t("financed", { amount: format.number(200000) })}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {OFFERS.map((o) => (
          <li key={o.name} className="ledger py-3 text-sm">
            <span className="min-w-0">
              <span className="block font-medium text-foreground" dir="ltr">
                {o.name}
              </span>
              <span className="block text-xs text-muted-foreground">{t(o.modeKey)}</span>
            </span>
            <span aria-hidden="true" className="ledger-fill" />
            <span className="tabular shrink-0 text-end">
              <span className="block font-semibold text-foreground">{format.number(o.monthly)} MAD</span>
              <span className="block text-xs text-muted-foreground">{t("monthly")}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS: Step[] = [
  { key: "forFarmers", icon: Sprout, Preview: FieldsPreview },
  { key: "forOwners", icon: Tractor, Preview: EquipmentPreview },
  { key: "forFinancing", icon: Landmark, Preview: FinancingPreview },
];

/* ---------- Section ---------- */

export function StorySequence() {
  const t = useTranslations("marketing.story");
  const sectionRef = useRef<HTMLElement | null>(null);
  const stepsRef = useRef<HTMLOListElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  // No pinning: content always scrolls at the user's pace. ScrollTrigger only
  // observes which story is centred in the viewport and scrubs the progress rail.
  useGSAP(
    () => {
      if (!stepsRef.current) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-step]", stepsRef.current);

      const triggers = items.map((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        })
      );

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!fillRef.current) return;
        gsap.fromTo(
          fillRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: stepsRef.current,
              start: "top 55%",
              end: "bottom 55%",
              scrub: true,
            },
          }
        );
      });

      return () => {
        triggers.forEach((t) => t.kill());
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section id="for-owners" ref={sectionRef} className="relative scroll-mt-16 border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-terracotta">{t("sectionEyebrow")}</p>
          <h2 className="type-title-display-2 mt-3 text-foreground">{t("sectionTitle")}</h2>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Scrolling stories */}
          <ol ref={stepsRef} className="relative flex flex-col gap-16 lg:col-span-6 lg:gap-0">
            {/* progress rail */}
            <div aria-hidden className="absolute inset-y-0 start-[23px] hidden w-px bg-border lg:block">
              <div ref={fillRef} className="h-full w-full origin-top bg-terracotta motion-reduce:hidden" />
            </div>

            {STEPS.map((step, i) => {
              const isActive = active === i;
              return (
                <li key={step.key} data-step className="relative flex flex-col gap-6 lg:min-h-[70vh] lg:justify-center lg:ps-20">
                  <div
                    className={cn(
                      "flex flex-col items-start gap-3 transition-opacity duration-500 motion-reduce:transition-none",
                      "lg:opacity-45",
                      isActive && "lg:opacity-100"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-full border bg-card transition-colors duration-500 lg:absolute lg:start-0 lg:top-1/2 lg:-translate-y-1/2",
                        isActive ? "border-terracotta text-terracotta" : "border-border text-muted-foreground"
                      )}
                    >
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-medium text-terracotta">{t(`${step.key}Eyebrow`)}</p>
                    <h3 className="text-2xl leading-tight font-semibold tracking-tight text-foreground sm:text-3xl">
                      {t(`${step.key}Title`)}
                    </h3>
                    <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{t(`${step.key}Description`)}</p>
                  </div>

                  {/* Inline preview on small screens */}
                  <div aria-hidden="true" className="rounded-2xl border border-border bg-background p-5 lg:hidden">
                    <step.Preview />
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Sticky preview (desktop): the one scroll-linked interaction on the
              page. It follows the story being read; it does not move on its own. */}
          <div className="hidden lg:col-span-6 lg:block">
            <div className="sticky top-16 flex h-[calc(100vh-4rem)] items-center">
              <div className="relative w-full">
                <div aria-hidden="true" className="bg-furrows absolute -inset-4 top-8 -z-0 rounded-2xl" />
                <div className="relative grid rounded-2xl border border-border bg-background p-6">
                  {STEPS.map((step, i) => (
                    <div
                      key={step.key}
                      aria-hidden="true"
                      className={cn(
                        "col-start-1 row-start-1 flex flex-col justify-center transition-opacity duration-300 motion-reduce:transition-none",
                        active === i ? "opacity-100" : "pointer-events-none opacity-0"
                      )}
                    >
                      <step.Preview />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
