import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  // The page's primary action(s). Sits beside the title on wide screens and
  // drops below it, full width, on phones so it is always easy to reach.
  actions?: ReactNode;
  // "Where did I come from / how do I get out": a link back to the parent list.
  back?: { href: string; label: string };
  className?: string;
}

// The one page title block. Every screen answers "where am I?" the same way:
// same type step, same spacing, same place for the main action.
export function PageHeader({ title, description, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {back && <BackLink href={back.href} label={back.label} className="mb-2" />}
        <h1 className="type-title-1 text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 *:max-sm:flex-1">{actions}</div>
      )}
    </header>
  );
}

// "How do I get out": a link back to the parent list. Used on its own on
// detail pages whose title lives inside the content.
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "-ms-1 inline-flex min-h-10 items-center gap-1 rounded-lg pe-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
      {label}
    </Link>
  );
}

// Section title inside a page, one step below the page title.
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 className="type-headline text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
