"use client";

import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { PERSONAS } from "@/lib/content";
import { useScrollReveal } from "@/lib/useScrollReveal";

export function WhosInTheRoom() {
  const headerRef = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal]",
    stagger: 0.1,
  });
  const listRef = useScrollReveal<HTMLUListElement>({
    selector: "li",
    stagger: 0.06,
    y: 20,
  });

  return (
    <Section id="whos-in-the-room">
      <div ref={headerRef} className="max-w-2xl">
        <SectionKicker data-reveal index="02" label="who's in the room" />
        <SectionTitle data-reveal className="mt-6">
          you don&apos;t have to be an ai expert.
        </SectionTitle>
        <p data-reveal className="prose-quiet mt-6">
          you just have to be building something, learning something, or curious
          enough to keep up. on any given weekend, this is who you might be
          sitting next to.
        </p>
      </div>

      <ul
        ref={listRef}
        className="mt-14 grid gap-x-12 border-t border-border/40 md:mt-20 md:grid-cols-2"
      >
        {PERSONAS.map((persona, index) => (
          <li
            key={persona.line}
            className="group flex items-start gap-5 border-b border-border/40 py-5 md:py-6"
          >
            <span className="mt-1 font-mono text-[11px] tracking-[0.12em] text-accent/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-base leading-relaxed text-foreground/85 transition-colors group-hover:text-foreground md:text-lg">
              {persona.line}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-muted">
        ten different starting points. one shared curiosity.
      </p>
    </Section>
  );
}
