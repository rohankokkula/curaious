"use client";

import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { useScrollReveal } from "@/lib/useScrollReveal";

const ROLE = [
  "reads every application and picks the ten",
  "hosts each weekend session",
  "helps you shape your talk before you give it",
  "collects the feedback and passes it back to you",
];

export function Curator() {
  const ref = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.09,
  });

  return (
    <Section id="curator">
      <div
        ref={ref}
        className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-16"
      >
        <div data-reveal>
          <SectionKicker index="05" label="who's behind it" />
          <SectionTitle className="mt-6">
            every batch is curated by hand.
          </SectionTitle>
        </div>

        <div className="space-y-6">
          <p data-reveal className="prose-quiet">
            i put each cohort together myself. i read the applications, pick the
            ten, and try to build a room where the mix of people is the point.
            then i stay in it for the whole season.
          </p>
          <ul data-reveal className="divide-y divide-border/40 border-y border-border/40">
            {ROLE.map((item) => (
              <li
                key={item}
                className="flex items-baseline gap-3 py-3.5 text-[15px] text-foreground/85 md:text-base"
              >
                <span aria-hidden className="text-accent/70">
                  ·
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p data-reveal className="prose-quiet">
            i&apos;d rather run one table properly than ten of them badly.
          </p>
        </div>
      </div>
    </Section>
  );
}
