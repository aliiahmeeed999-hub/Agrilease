"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Sprout, Tractor, LineChart, Bot } from "lucide-react";
import { cn } from "@/utils/cn";

const AI_TABS = [
  { label: "Yield Prediction", href: "/ai/yield", icon: Sprout },
  { label: "Equipment Match", href: "/ai/recommendations", icon: Tractor },
  { label: "Demand Forecast", href: "/ai/forecast", icon: LineChart },
  { label: "Assistant", href: "/ai/assistant", icon: Bot },
];

export function AiSubNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border">
      <nav className="mx-auto flex w-full max-w-7xl gap-6 overflow-x-auto px-4 sm:px-6">
        {AI_TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                isActive && "border-primary text-foreground"
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
