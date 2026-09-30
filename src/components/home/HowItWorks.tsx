"use client";

import { CalendarDays, Mic, MessageSquare, TrendingUp } from "lucide-react";
import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { FEEDBACK_CATEGORIES } from "@/lib/content";
import { useScrollReveal } from "@/lib/useScrollReveal";

const CADENCE = [
  {
    step: "four weekends",
    detail: "same ten people, every time. nothing resets.",
    icon: CalendarDays,
  },
  {
    step: "one or two take the floor",
    detail: "something they know well, or something they're still working out.",
    icon: Mic,
  },
  {
    step: "the other nine respond",
    detail: "structured feedback, plus notes in their own words.",
    icon: MessageSquare,
  },
  {
    step: "it follows you",
    detail: "by the end, a record of how you present, not a memory of it.",
    icon: TrendingUp,
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
        {CADENCE.map((item) => (
          <li key={item.step} className="border-t border-border/40 pt-6">
            <item.icon aria-hidden className="size-5 text-accent" strokeWidth={1.5} />
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
