"use client";

import type { ElementType, ReactNode } from "react";
import { useScrollReveal, type ScrollRevealOptions } from "@/hooks/useScrollReveal";
import { cn } from "@/utils/cn";

interface RevealProps extends ScrollRevealOptions {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

export function Reveal({ children, as: Component = "div", className, ...options }: RevealProps) {
  const ref = useScrollReveal<HTMLDivElement>(options);

  return (
    <Component ref={ref} className={cn(className)}>
      {children}
    </Component>
  );
}
