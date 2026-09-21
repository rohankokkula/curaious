"use client";

import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { useScrollReveal } from "@/lib/useScrollReveal";

export function WhatItIs() {
  const ref = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.1,
  });

  return (
    <Section id="what-it-is">
      <div ref={ref} className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-16">
        <div data-reveal>
          <SectionKicker index="01" label="what this is" />
          <SectionTitle className="mt-6">
            curaious isn&apos;t a group where you meet people once.
          </SectionTitle>
        </div>

        <div className="space-y-6">
          <p data-reveal className="prose-quiet">
            it&apos;s a group where you spend enough time with the same nine
            people to actually know what they&apos;re working on, what
            they&apos;re learning, and what they&apos;re curious about.
          </p>
          <p data-reveal className="prose-quiet">
            ten people from very different backgrounds and very different parts
            of the world, all curious about the same thing. students, founders,
            developers, pms, researchers, designers, open source contributors,
            and people quietly experimenting with ai day to day.
          </p>
          <p data-reveal className="text-base leading-relaxed text-foreground md:text-lg">
            no audience, no keynote, no networking round. just a table small
            enough that everyone has to show up as themselves.
          </p>
        </div>
      </div>
    </Section>
  );
}
