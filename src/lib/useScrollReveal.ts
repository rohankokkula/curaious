"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface ScrollRevealOptions {
  /**
   * Optional selector, scoped to the returned ref, for the elements to reveal.
   * When omitted, the ref element itself is revealed.
   */
  selector?: string;
  /** Distance in px the targets rise from. */
  y?: number;
  /** Delay between staggered targets, in seconds. */
  stagger?: number;
  /** Tween duration, in seconds. */
  duration?: number;
  /** ScrollTrigger `start` value. */
  start?: string;
  /** When true the reveal plays once and never reverses. */
  once?: boolean;
}

/**
 * Reveals elements as they scroll into view.
 *
 * Deliberately uses `toggleActions` (not `pin`, not `scrub`) so the animation
 * is never tied to an ongoing scroll position — nothing can fall behind the
 * scroll and force-snap. Reverts itself (tweens + ScrollTriggers) on unmount
 * via `useGSAP`, and bails out entirely under `prefers-reduced-motion`.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  selector,
  y = 26,
  stagger = 0.08,
  duration = 0.8,
  start = "top 85%",
  once = false,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const container = ref.current;
      if (!container) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const targets: HTMLElement[] = selector
        ? gsap.utils.toArray<HTMLElement>(selector, container)
        : [container];

      if (targets.length === 0) return;

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease: "power2.out",
          overwrite: "auto",
          scrollTrigger: {
            trigger: container,
            start,
            toggleActions: once
              ? "play none none none"
              : "play none none reverse",
          },
        },
      );
    },
    {
      scope: ref,
      dependencies: [selector, y, stagger, duration, start, once],
    },
  );

  return ref;
}
