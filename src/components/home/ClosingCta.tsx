"use client";

import Link from "next/link";
import { Section, SectionKicker } from "@/components/home/Section";
import { useScrollReveal } from "@/lib/useScrollReveal";

export function ClosingCta() {
  const ref = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.1,
  });

  return (
    <Section id="apply-cta" className="bg-surface">
      <div ref={ref} className="max-w-3xl">
        <SectionKicker data-reveal index="06" label="cohort 01 · applications open" />

        <h2
          data-reveal
          className="heading-display mt-7 text-balance text-[2rem] leading-[1.1] md:mt-9 md:text-[3.5rem]"
        >
          there are ten seats.
          <span className="mt-2 block text-muted md:mt-3">
            one of them could be yours.
          </span>
        </h2>

        <p data-reveal className="prose-quiet mt-7 max-w-xl">
          the application is a set of questions about what you&apos;re working
          on and what you want to learn. no resume, no interview loop — i read
          every one myself.
        </p>

        <div
          data-reveal
          className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-12"
        >
          <Link
            href="/apply"
            className="focus-ring group inline-flex items-center gap-3 bg-foreground px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-background transition hover:bg-accent hover:text-foreground"
          >
            apply for a seat
            <span aria-hidden className="transition group-hover:translate-x-1">
              →
            </span>
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            hyderabad · in person
          </p>
        </div>
      </div>
    </Section>
  );
}
