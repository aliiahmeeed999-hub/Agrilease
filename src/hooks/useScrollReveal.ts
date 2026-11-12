import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

export interface ScrollRevealOptions {
  y?: number;
  stagger?: number;
  duration?: number;
  start?: string;
  targetSelector?: string;
}

export function useScrollReveal<T extends HTMLElement>({
  y = 32,
  stagger = 0.08,
  duration = 0.7,
  start = "top 82%",
  targetSelector = ":scope > *",
}: ScrollRevealOptions = {}) {
  const containerRef = useRef<T | null>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const targets = gsap.utils.toArray<HTMLElement>(targetSelector, containerRef.current);
      if (targets.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(targets, { autoAlpha: 0, y, willChange: "transform, opacity" });
        gsap.to(targets, {
          autoAlpha: 1,
          y: 0,
          duration,
          stagger,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start,
            once: true,
          },
          onComplete: () => gsap.set(targets, { willChange: "auto" }),
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(targets, { autoAlpha: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [y, stagger, duration, start, targetSelector] }
  );

  return containerRef;
}
