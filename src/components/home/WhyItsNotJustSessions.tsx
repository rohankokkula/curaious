"use client";

import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { useScrollReveal } from "@/lib/useScrollReveal";

const PAYOFFS = [
  {
    who: "a founder",
    what: "could walk out with their first handful of real users.",
  },
  {
    who: "a student",
    what: "could get honest feedback on their project instead of polite encouragement.",
  },
  {
    who: "a developer",
    what: "could find the collaborator they've been trying to find on the internet.",
  },
  {
    who: "a researcher",
    what: "could find nine people who actually care what their work is about.",
  },
  {
    who: "someone who knows a tool cold",
    what: "could teach the rest of the group in an afternoon.",
  },
];

export function WhyItsNotJustSessions() {
  const headerRef = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.1,
  });
  const listRef = useScrollReveal<HTMLUListElement>({
    selector: "li",
    stagger: 0.08,
    y: 20,
  });
  const closingRef = useScrollReveal<HTMLParagraphElement>({ y: 20 });

  return (
    <Section id="why-not-just-sessions">
      <div ref={headerRef} className="max-w-2xl">
        <SectionKicker data-reveal index="04" label="why it isn't just sessions" />
        <SectionTitle data-reveal className="mt-6">
          with just ten people, you get to actually know the other nine.
        </SectionTitle>
        <p data-reveal className="prose-quiet mt-6">
          that&apos;s the part a bigger room can&apos;t give you. when the group
          is this small, the useful things tend to happen sideways.
        </p>
      </div>

      <ul ref={listRef} className="mt-14 space-y-0 md:mt-20">
        {PAYOFFS.map((payoff) => (
          <li
            key={payoff.who}
            className="border-t border-border/40 py-6 last:border-b last:border-border/40 md:py-7"
          >
            <p className="text-lg leading-snug md:text-2xl">
              <span className="heading-display text-foreground">
                {payoff.who}
              </span>{" "}
              <span className="text-muted">{payoff.what}</span>
            </p>
          </li>
        ))}
      </ul>

      <p
        ref={closingRef}
        className="heading-display mt-16 max-w-3xl text-balance text-xl leading-relaxed md:mt-20 md:text-3xl md:leading-snug"
      >
        by the end of four weekends, this should feel less like ten people who
        attended the same sessions, and more like ten people who built a
        connection with each other.
      </p>
    </Section>
  );
}
