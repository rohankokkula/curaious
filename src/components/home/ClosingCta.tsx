"use client";

import { Section, SectionKicker } from "@/components/home/Section";
import { INVITE_FORM_URL } from "@/lib/content";
import { useScrollReveal } from "@/lib/useScrollReveal";

export function ClosingCta() {
  const ref = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.1,
  });

  return (
    <Section id="apply-cta" className="bg-surface">
      <div ref={ref} className="max-w-3xl">
        <SectionKicker data-reveal index="06" label="ten seats" />

        <h2
          data-reveal
          className="heading-display mt-7 text-balance text-[2rem] leading-[1.1] md:mt-9 md:text-[3.5rem]"
        >
          one of them could be yours.
        </h2>

        <p data-reveal className="prose-quiet mt-7 max-w-xl">
          a few questions about what you&apos;re building and what you want to
          learn. no resume, no interview loop. i read every one myself.
        </p>

        <div data-reveal className="mt-10 md:mt-12">
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
    </Section>
  );
}
