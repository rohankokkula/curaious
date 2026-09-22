"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { INVITE_FORM_URL } from "@/lib/content";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Entrance only: plays once on mount, never tied to scroll position.
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
      className="relative flex min-h-[calc(100svh-4.5rem)] items-center px-5 pb-24 pt-10 md:px-8 md:pb-32 md:pt-16"
    >
      <div className="relative mx-auto w-full max-w-5xl">
        <p
          data-hero-rise="true"
          className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted"
        >
          ten seats · two speakers a session
        </p>

        <h1
          data-hero-rise="true"
          className="heading-display mt-7 max-w-3xl text-balance text-[2.15rem] leading-[1.1] md:mt-9 md:text-[4.25rem] md:leading-[1.04]"
        >
          10 curious minds around ai.
          <span className="mt-2 block text-muted md:mt-3">
            everyone teaches, everyone learns.
          </span>
        </h1>

        <div data-hero-rise="true" className="mt-10 md:mt-12">
          <a
            href={INVITE_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring group inline-flex items-center gap-3 bg-foreground px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-background transition hover:bg-accent hover:text-foreground"
          >
            get an invite
            <span aria-hidden className="transition group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>

        <p
          data-hero-rise="true"
          className="mt-16 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted/70 md:mt-24"
        >
          <span aria-hidden>↓</span>
          what this actually is
        </p>
      </div>
    </section>
  );
}
