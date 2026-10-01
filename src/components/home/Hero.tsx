"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { StageScene } from "@/components/home/hero/StageScene";
import { COHORT } from "@/components/home/hero/cohort";
import { INVITE_FORM_URL } from "@/lib/content";

/** One full handover is ~1.8s of motion (walk off, walk on, then nine
 * scores landing), so the old 2s cadence cut it off mid-sequence. This
 * leaves roughly a second to actually read the slide before the next turn. */
const ROTATE_MS = 3200;

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Hands the stage to the next person. Plain state + setInterval rather
  // than a GSAP timeline: real content changes each turn (who's speaking,
  // who's in the audience, what they scored), so React owns "who's up" and
  // GSAP animates each transition downstream of it.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % COHORT.length);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, []);

  // Entrance only: plays once on mount, never tied to scroll position.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from('[data-hero-rise="true"]', {
        opacity: 0,
        y: 22,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden bg-[#050506] px-5 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12"
    >
      {/* Ambient floating light. Hardcoded, theme-independent — the stage
          is deliberately always dark regardless of the site's light/dark
          toggle. Radial gradients that fade to nothing at their own edge,
          placed fully inside the section: a blurred disc hanging off the
          bottom got sliced flat by the section's overflow clip. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 -left-40 size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.2)_0%,rgba(20,184,166,0.08)_40%,transparent_70%)] md:-left-48 md:size-[36rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 -right-40 size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(5,150,105,0.2)_0%,rgba(5,150,105,0.08)_40%,transparent_70%)] md:-right-48 md:size-[36rem]"
      />

      <div className="relative mx-auto w-full max-w-5xl">
        <StageScene activeIndex={activeIndex} />

        <div className="mx-auto mt-14 max-w-2xl text-center md:mt-20">
          <p
            data-hero-rise="true"
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/50"
          >
            ten seats · two speakers a session
          </p>

          <h1
            data-hero-rise="true"
            className="heading-display mt-6 text-balance text-[2.15rem] leading-[1.1] text-white md:mt-8 md:text-[3.5rem] md:leading-[1.04]"
          >
            10 curious minds around ai.
            <span className="mt-2 block text-white/45 md:mt-3">
              everyone teaches, everyone learns.
            </span>
          </h1>

          <div data-hero-rise="true" className="mt-9 flex justify-center md:mt-11">
            <a
              href={INVITE_FORM_URL}
              target="_blank"
              rel="noreferrer"
              className="focus-ring group inline-flex items-center gap-3 bg-white px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
            >
              get an invite
              <span aria-hidden className="transition group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>
        </div>

        <div
          data-hero-rise="true"
          className="relative mt-16 flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 md:mt-24"
        >
          <ul className="space-y-0.5 leading-relaxed">
            <li>ideas</li>
            <li>people</li>
            <li>perspectives</li>
            <li>together</li>
          </ul>

          {/* hidden on phones: three labels in one row collide at ~360px */}
          <div className="hidden flex-col items-center gap-2 text-white/45 sm:flex">
            <span aria-hidden className="h-8 w-px bg-white/20 md:h-12" />
            <span>scroll to explore</span>
            <span aria-hidden>↓</span>
          </div>

          <p className="max-w-[7rem] text-right leading-relaxed md:max-w-[9rem]">
            a curious community
          </p>
        </div>
      </div>
    </section>
  );
}
