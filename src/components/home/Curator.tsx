"use client";

import { MessageSquareText, Mic, PenLine, Users } from "lucide-react";
import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { useScrollReveal } from "@/lib/useScrollReveal";

/** Where the curator shows up across a season, in order. */
const TOUCHPOINTS = [
  { when: "before", icon: Users, what: "reads every application and picks the ten" },
  { when: "before your talk", icon: PenLine, what: "helps you shape it" },
  { when: "every weekend", icon: Mic, what: "hosts the session" },
  { when: "after", icon: MessageSquareText, what: "gets the room's feedback back to you" },
];

export function Curator() {
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-reveal]", stagger: 0.08 });

  return (
    <Section id="curator">
      <div ref={ref} className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16">
        <div data-reveal>
          <SectionKicker index="03" label="who's behind it" />
          <SectionTitle className="mt-6">curated by hand.</SectionTitle>

          <figure className="mt-8 rounded-2xl border border-border/60 bg-card p-6">
            <blockquote className="heading-display text-xl leading-snug text-foreground md:text-2xl">
              &ldquo;i&apos;d rather run one table properly than ten of them badly.&rdquo;
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              {/* the favicon mark: "ai", underlined */}
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-background text-sm leading-none text-foreground"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                <span className="underline decoration-[#e08a5a] decoration-2 underline-offset-[0.06em]">ai</span>
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">the curator</span>
                <span className="block text-xs text-muted">in the room for the whole season</span>
              </span>
            </figcaption>
          </figure>
        </div>

        <ol data-reveal className="grid content-start gap-3 sm:grid-cols-2">
          {TOUCHPOINTS.map(({ when, icon: Icon, what }, i) => (
            <li key={when} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="font-mono text-[10px] text-muted tabular-nums">0{i + 1}</span>
              </div>
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{when}</p>
              <p className="mt-1.5 text-[15px] leading-snug text-foreground/90">{what}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
