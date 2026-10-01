"use client";

import { Mic } from "lucide-react";
import { Section } from "@/components/home/Section";
import { useScrollReveal } from "@/lib/useScrollReveal";

const ROTATION = [
  {
    week: "week 2",
    talks: [
      { name: "Ananya Sharma", talk: "AI Harness Engineering", mine: false },
      { name: "You", talk: "presenting this week", mine: true },
    ],
  },
  {
    week: "week 3",
    talks: [
      { name: "Karthik Menon", talk: "Evaluating AI Systems", mine: false },
      { name: "Diya Iyer", talk: "Open Source LLM Tools", mine: false },
    ],
  },
];

const RATINGS = [
  { label: "Content Quality", score: 8 },
  { label: "Technical Depth", score: 9 },
  { label: "Delivery & Clarity", score: 8 },
  { label: "Practical Takeaways", score: 7 },
];

/** Out of 10: a short bar plus the number. */
function Score({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${score * 10}%` }} />
      </span>
      <span className="w-9 text-right text-[12px] font-semibold tabular-nums text-foreground">{score}/10</span>
    </div>
  );
}

/** A window frame that reads as "this is an actual screenshot," not decoration.
 * `flex-1` (inside a flex-column item), not `h-full`: h-full made the window
 * as tall as its whole grid item — caption included — which pushed each
 * caption out of its item and underneath the next card on phones. */
function AppWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 border-b border-border/60 bg-surface px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{title}</span>
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

export function ProductPreview() {
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-reveal]", stagger: 0.1, y: 18 });

  return (
    <Section id="preview" seam={false}>
      <div ref={ref} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div data-reveal className="flex flex-col">
          <AppWindow title="schedule">
            <div className="space-y-4">
              {ROTATION.map((group) => (
                <div key={group.week}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{group.week} · two speakers</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {group.talks.map((row) => (
                      <li
                        key={row.name}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                          row.mine ? "border-accent/40 bg-accent-soft" : "border-border/60"
                        }`}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-muted">
                          {row.name === "You" ? "Y" : row.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{row.talk}</p>
                          <p className="truncate text-[11px] text-muted">{row.name}</p>
                        </div>
                        {row.mine ? <Mic className="size-3.5 shrink-0 text-accent" /> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AppWindow>
          <p className="mt-3 text-sm text-muted">
            two new speakers every session over 3 weekends. by the season&apos;s end, everyone&apos;s presented once.
          </p>
        </div>

        <div data-reveal className="flex flex-col">
          <AppWindow title="your feedback">
            <div className="space-y-2.5">
              {RATINGS.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3">
                  <span className="text-[13px]">{r.label}</span>
                  <Score score={r.score} />
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-surface p-3 text-[12px] leading-relaxed text-muted">
              &ldquo;clear structure, the demo made the tradeoff click.&rdquo;
            </div>
          </AppWindow>
          <p className="mt-3 text-sm text-muted">
            after each talk, the other nine rate it and leave notes.
          </p>
        </div>

        <div data-reveal className="flex flex-col">
          <AppWindow title="your profile">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                RK
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">You</p>
                <p className="truncate text-[11px] text-muted">AI Harness Engineering</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-surface p-3">
              <p className="text-[11px] text-muted">average score</p>
              <p className="mt-0.5 text-2xl font-bold">
                8.6<span className="text-sm font-medium text-muted"> / 10</span>
              </p>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-background">
                <span className="block h-full w-[86%] rounded-full bg-accent" />
              </span>
              <p className="mt-1 text-[11px] text-muted">8 responses</p>
            </div>
          </AppWindow>
          <p className="mt-3 text-sm text-muted">
            every score and note you get is right there on your profile.
          </p>
        </div>
      </div>
    </Section>
  );
}
