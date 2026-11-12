"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";

// Details for the selected feature. A panel on the map's trailing side on
// wide screens; a bottom sheet over the lower part of the map on phones, so
// the selected feature stays visible above it. Escape and the close button
// both deselect.
export function MapPanel({
  title,
  subtitle,
  onClose,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations("maps");
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section
      aria-label={typeof title === "string" ? title : undefined}
      className={cn(
        "absolute z-10 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-lg",
        // phone: bottom sheet
        "inset-x-0 bottom-0 max-h-[60%] rounded-t-2xl",
        // tablet and up: side panel
        // leaves the control column (zoom, reset, full screen) uncovered
        "sm:inset-x-auto sm:end-16 sm:top-3 sm:bottom-3 sm:max-h-none sm:w-80 sm:rounded-xl",
        className
      )}
    >
      <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />
      <header className="flex items-start gap-3 border-b border-border px-4 pt-3 pb-3 sm:pt-4">
        <div className="min-w-0 flex-1">
          <h2 className="type-headline text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("closeDetails")}
          className="-me-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4.5" aria-hidden="true" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-sm">{children}</div>
    </section>
  );
}

// A label/value row inside a map panel, in the app's ledger style.
export function MapPanelRow({ label, value, dir }: { label: string; value: ReactNode; dir?: "ltr" | "rtl" }) {
  return (
    <div className="ledger py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <span aria-hidden="true" className="ledger-fill" />
      <dd className="tabular text-end font-medium text-foreground" dir={dir}>
        {value}
      </dd>
    </div>
  );
}
