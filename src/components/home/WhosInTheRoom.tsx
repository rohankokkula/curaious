"use client";

import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { PERSONAS } from "@/lib/content";
import { useScrollReveal } from "@/lib/useScrollReveal";

/** Same six-color avatar story as the real Avatar component, in the tones
 * that hold up on the landing page's dark palette (this page doesn't
 * follow the theme toggle, so these are stated outright rather than as
 * `dark:` variants). */
const PALETTE = [
  "bg-emerald-500/15 text-emerald-300",
  "bg-sky-500/15 text-sky-300",
  "bg-amber-500/15 text-amber-300",
  "bg-violet-500/15 text-violet-300",
  "bg-rose-500/15 text-rose-300",
  "bg-teal-500/15 text-teal-300",
];

function initialsFor(line: string) {
  const word = line.replace(/^(someone|a)\s+/, "").split(/\s+/)[0];
  return word.slice(0, 2).toUpperCase();
}

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
          you just have to be building something, or curious enough to keep
          up. this is the roster on any given weekend:
        </p>
      </div>

      <ul ref={listRef} className="mt-14 grid gap-3 md:mt-20 md:grid-cols-2">
        {PERSONAS.map((persona, index) => (
          <li
            key={persona.line}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
          >
            <span
              aria-hidden
              className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${PALETTE[index % PALETTE.length]}`}
            >
              {initialsFor(persona.line)}
            </span>
            <span className="pt-1.5 text-[15px] leading-snug text-foreground/85 md:text-base">
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
