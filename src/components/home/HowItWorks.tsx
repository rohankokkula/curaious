"use client";

import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { FEEDBACK_CATEGORIES } from "@/lib/content";
import { useScrollReveal } from "@/lib/useScrollReveal";

const CADENCE = [
  {
    step: "four weekends",
    detail:
      "a season runs across four weekends with the same ten people every time. nothing resets, nobody new walks in halfway.",
  },
  {
    step: "one or two take the floor",
    detail:
      "each weekend, one or two of the ten present a topic — something they know well, or something they're still working out.",
  },
  {
    step: "the other nine respond",
    detail:
      "everyone else in the room gives structured feedback on the same set of parameters, plus notes in their own words.",
  },
  {
    step: "it follows you through the season",
    detail:
      "feedback is collected every weekend, so by the end you have a record of how you present — not just a vague memory of it.",
  },
];

export function HowItWorks() {
  const headerRef = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.1,
  });
  const cadenceRef = useScrollReveal<HTMLOListElement>({
    selector: "li",
    stagger: 0.09,
  });
  const categoriesRef = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.07,
    y: 18,
  });

  return (
    <Section id="how-it-works">
      <div ref={headerRef} className="max-w-2xl">
        <SectionKicker data-reveal index="03" label="how a season runs" />
        <SectionTitle data-reveal className="mt-6">
          four weekends. one topic at a time.
        </SectionTitle>
      </div>

      <ol ref={cadenceRef} className="mt-14 grid gap-10 md:mt-20 md:grid-cols-2 md:gap-x-16 md:gap-y-14">
        {CADENCE.map((item, index) => (
          <li key={item.step} className="border-t border-border/40 pt-6">
            <p className="font-mono text-[11px] tracking-[0.12em] text-accent/70">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="heading-display mt-3 text-xl md:text-2xl">
              {item.step}
            </h3>
            <p className="prose-quiet mt-3 text-[15px] md:text-base">
              {item.detail}
            </p>
          </li>
        ))}
      </ol>

      <div ref={categoriesRef} className="mt-20 md:mt-28">
        <p
          data-reveal
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted"
        >
          what a talk gets rated on
        </p>
        <dl className="mt-8 divide-y divide-border/40 border-y border-border/40">
          {FEEDBACK_CATEGORIES.map((category) => (
            <div
              key={category.title}
              data-reveal
              className="grid gap-1.5 py-5 md:grid-cols-[180px_1fr] md:gap-8 md:py-6"
            >
              <dt className="heading-display text-lg md:text-xl">
                {category.title}
              </dt>
              <dd className="text-[15px] leading-relaxed text-muted md:text-base">
                {category.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
