"use client";

import { Plus } from "lucide-react";
import { COHORT, TONES, initialsFor } from "@/components/home/hero/cohort";
import { Section, SectionKicker } from "@/components/home/Section";
import { INVITE_FORM_URL } from "@/lib/content";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { cn } from "@/lib/utils";

/** Nine seats taken, one open: the cast from the hero, minus the last seat. */
const TAKEN = COHORT.slice(0, 9);

export function ClosingCta() {
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-reveal]", stagger: 0.1 });

  return (
    <Section id="apply-cta">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface px-4 py-12 text-center sm:px-6 md:px-12 md:py-16"
      >
        {/* same ambient light as the hero, so the page closes in the room it opened in */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(224,138,90,0.14)_0%,rgba(224,138,90,0.05)_40%,transparent_70%)] md:size-[40rem]"
        />

        <div className="relative">
          <SectionKicker data-reveal index="04" label="ten seats" className="justify-center" />

          {/* the room: nine taken, one with your name on it */}
          <div data-reveal className="mt-8 flex items-center justify-center gap-1 sm:gap-1.5 md:mt-10 md:gap-2.5">
            {TAKEN.map((member) => (
              <span
                key={member.id}
                className={cn(
                  "flex size-[26px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-[8px] sm:size-9 sm:text-[10px] md:size-11 md:text-[11px]",
                  TONES[member.tone % TONES.length].chip,
                )}
              >
                {initialsFor(member.name)}
              </span>
            ))}
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-accent text-accent sm:size-11 md:size-14">
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-accent/40 motion-reduce:hidden" />
              <Plus className="size-3.5 sm:size-4 md:size-5" />
            </span>
          </div>

          <h2
            data-reveal
            className="heading-display mx-auto mt-8 max-w-3xl text-balance text-[2rem] leading-[1.1] md:mt-10 md:text-[3.5rem]"
          >
            one of them could be yours.
          </h2>

          <ul data-reveal className="mt-6 flex flex-wrap justify-center gap-2">
            {["a few questions", "no resume", "no interview loop"].map((fact) => (
              <li key={fact} className="rounded-full border border-border/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                {fact}
              </li>
            ))}
          </ul>

          <div data-reveal className="mt-9 md:mt-10">
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
        </div>
      </div>
    </Section>
  );
}
