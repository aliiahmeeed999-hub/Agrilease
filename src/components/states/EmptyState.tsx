import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/utils/cn";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  // What the user can do next (usually a single button or link). An empty
  // screen should point somewhere, not just report that nothing is here.
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 text-center",
        className
      )}
    >
      <div aria-hidden="true" className="bg-furrows absolute inset-x-0 top-0 h-2" />
      <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="type-headline text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
