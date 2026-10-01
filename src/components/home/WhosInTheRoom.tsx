"use client";

import { ArrowRight } from "lucide-react";
import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { useScrollReveal } from "@/lib/useScrollReveal";

/**
 * Who sits at the table, and what each of them walks out with: one card per
 * kind of person, "arrives" → "leaves with". (This used to be two sections,
 * a persona list here and a payoffs list further down, that said the same
 * thing twice.)
 */
const PEOPLE = [
  {
    who: "founder",
    tone: "text-emerald-300",
    arrives: "just shipped their first product",
    leaves: "their first handful of real users",
  },
  {
    who: "student",
    tone: "text-sky-300",
    arrives: "sanity-checking a side project",
    leaves: "honest feedback, not polite encouragement",
  },
  {
    who: "developer",
    tone: "text-amber-300",
    arrives: "automating half their week with scripts",
    leaves: "the collaborator they'd been looking for",
  },
  {
    who: "researcher",
    tone: "text-violet-300",
    arrives: "reads eval papers for fun",
    leaves: "nine people who care what the work is about",
  },
];

export function WhosInTheRoom() {
  const headerRef = useScrollReveal<HTMLDivElement>({ selector: "[data-reveal]", stagger: 0.1 });
  const listRef = useScrollReveal<HTMLUListElement>({ selector: "li", stagger: 0.07, y: 20 });

  return (
    <Section id="whos-in-the-room">
      <div ref={headerRef} className="max-w-2xl">
        <SectionKicker data-reveal index="02" label="who's in the room" />
        <SectionTitle data-reveal className="mt-6">
          you don&apos;t have to be an ai expert.
        </SectionTitle>
        <p data-reveal className="prose-quiet mt-5">
          just building something, or curious enough to keep up.
        </p>
      </div>

      <ul ref={listRef} className="mt-12 grid gap-3 sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
        {PEOPLE.map((person) => (
          <li key={person.who} className="flex flex-col rounded-2xl border border-border/60 bg-card p-5">
            <p className={`font-mono text-[11px] uppercase tracking-[0.2em] ${person.tone}`}>a {person.who}</p>

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">arrives</p>
            <p className="mt-1 text-[15px] leading-snug text-foreground/80 lg:min-h-[2.6rem]">{person.arrives}</p>

            <ArrowRight aria-hidden className="my-3 size-4 text-muted/60" />

            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">leaves with</p>
            <p className="heading-display mt-1 text-lg leading-snug text-foreground">{person.leaves}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
