import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";

interface CardStateProps {
  state: "loading" | "empty" | "error";
  // "loading" only: a skeleton shaped like the eventual content (e.g. a
  // stat-strip's pulsing blocks, a chart-shaped block) - falls back to a
  // generic block for cards that don't need a bespoke shape.
  loadingSkeleton?: ReactNode;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  onRetry?: () => void;
}

// The one shared loading/empty/error renderer every card in the app should
// use, so a user comparing two failed widgets side by side sees the exact
// same icon/heading/subtext/action structure rather than each card's own
// one-off version (see AGENTS.md-adjacent design spec: FarmWeatherCard used
// to render a bare <p> with no retry action instead of this).
export function CardState({ state, loadingSkeleton, icon, title, description, onRetry }: CardStateProps) {
  if (state === "loading") {
    return loadingSkeleton ?? <Skeleton className="h-32 w-full rounded-2xl" />;
  }
  if (state === "empty") {
    return <EmptyState icon={icon} title={title ?? ""} description={description} />;
  }
  return <ErrorState title={title} description={description} onRetry={onRetry} />;
}
