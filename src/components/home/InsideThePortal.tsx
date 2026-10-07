"use client";

import { BookMarked, CalendarDays, FileText, Gauge, Medal, PenLine, PlayCircle, Wrench } from "lucide-react";
import { BadgeArt } from "@/components/dashboard/BadgeArt";
import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { BADGE_LIST } from "@/lib/badges";
import { RATING_PARAMETERS } from "@/lib/ratings";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { cn } from "@/lib/utils";

/**
 * What members actually get once they're in: a bento of the portal's
 * features, each with a miniature of the real screen. Badge artwork and
 * the rating parameters come from the same modules the app uses, so this
 * can't drift from the product.
 */

function Card({
  icon: Icon,
  title,
  line,
  className,
  children,
}: {
  icon: typeof Gauge;
  title: string;
  line: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={cn("flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card", className)}>
      <div className="flex flex-1 items-center justify-center border-b border-border/50 bg-surface/50 p-5">{children}</div>
      <div className="p-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Icon aria-hidden className="size-4 text-accent" strokeWidth={1.75} />
          {title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{line}</p>
      </div>
    </li>
  );
}

const WEEKS = [
  { label: "w1", days: [{ title: "kickoff", tone: "neutral" }] },
  { label: "w2", days: [{ title: "agents", tone: "violet" }, { title: "benchmarks", tone: "cyan" }] },
  { label: "w3", days: [{ title: "frontier vs oss", tone: "rose" }, { title: "prompts", tone: "emerald" }] },
  { label: "w4", days: [{ title: "content", tone: "amber" }, { title: "recognitions", tone: "neutral" }] },
] as const;

const TONE: Record<string, string> = {
  neutral: "border-white/10 bg-white/[0.04] text-muted",
  violet: "border-violet-400/30 bg-violet-950/70 text-violet-300",
  cyan: "border-cyan-400/30 bg-cyan-950/70 text-cyan-300",
  rose: "border-rose-400/30 bg-rose-950/70 text-rose-300",
  emerald: "border-emerald-400/30 bg-emerald-950/70 text-emerald-300",
  amber: "border-yellow-400/40 bg-yellow-400/[0.08] text-yellow-300",
};

function ScheduleMini() {
  return (
    <div className="w-full space-y-1.5">
      {WEEKS.map((week) => (
        <div key={week.label} className="flex items-center gap-2">
          <span className="w-6 shrink-0 font-mono text-[9px] uppercase text-muted">{week.label}</span>
          {week.days.map((day) => (
            <div key={day.title} className={cn("flex flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5", TONE[day.tone])}>
              <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em]">{day.title}</span>
              {day.tone !== "neutral" ? (
                <span className="flex gap-1">
                  <span className="h-2.5 w-4 rounded-sm bg-current opacity-60" />
                  <span className="h-2.5 w-4 rounded-sm border border-dashed border-current opacity-60" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DeckMini() {
  return (
    <div className="w-full max-w-56">
      <div className="relative aspect-video rounded-lg border border-border bg-[#111117] p-3">
        <div className="h-1.5 w-2/3 rounded-full bg-foreground/80" />
        <div className="mt-1 h-1 w-1/2 rounded-full bg-foreground/30" />
        <div className="mt-3 flex h-[42%] items-end gap-1">
          {[35, 60, 45, 85, 70].map((h, i) => (
            <span key={i} className={cn("flex-1 rounded-sm", i === 3 ? "bg-accent" : "bg-accent/25")} style={{ height: `${h}%` }} />
          ))}
        </div>
        <span className="absolute right-2 bottom-1.5 font-mono text-[8px] text-muted">04/12</span>
      </div>
      <div className="mt-2 h-0.5 rounded-full bg-border">
        <span className="block h-full w-1/3 rounded-full bg-accent" />
      </div>
    </div>
  );
}

const SAMPLE_SCORES = [8, 9, 8, 7, 9];

function ScoresMini() {
  return (
    <div className="w-full space-y-2">
      {RATING_PARAMETERS.map((p, i) => (
        <div key={p.key} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-[10px] text-muted">{p.label}</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${SAMPLE_SCORES[i] * 10}%` }} />
          </span>
          <span className="w-5 text-right font-mono text-[10px] text-foreground tabular-nums">{SAMPLE_SCORES[i]}</span>
        </div>
      ))}
    </div>
  );
}

const LINKS = [
  { icon: FileText, kind: "paper", title: "Scaling laws for agents", by: "KM" },
  { icon: Wrench, kind: "tool", title: "An eval harness worth stealing", by: "DI" },
  { icon: PlayCircle, kind: "video", title: "How diffusion actually works", by: "SR" },
];

function BookmarksMini() {
  return (
    <ul className="w-full space-y-1.5">
      {LINKS.map((link) => (
        <li key={link.title} className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] grayscale">
            <link.icon className="size-3.5 text-muted" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium text-foreground/90">{link.title}</span>
            <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-muted">{link.kind}</span>
          </span>
          <span className="font-mono text-[8px] text-muted">{link.by}</span>
        </li>
      ))}
    </ul>
  );
}

function ThoughtsMini() {
  return (
    <div className="w-full rounded-lg border border-border/70 bg-card p-3.5">
      <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-accent">hearticles</p>
      <p className="heading-display mt-1.5 text-[15px] leading-snug text-foreground">What a week of evals taught me about vibes</p>
      <div className="mt-2 space-y-1">
        <span className="block h-1 w-full rounded-full bg-foreground/15" />
        <span className="block h-1 w-5/6 rounded-full bg-foreground/15" />
        <span className="block h-1 w-2/3 rounded-full bg-foreground/15" />
      </div>
      <p className="mt-2.5 text-[9px] text-muted">by a member · 6 min read · public page</p>
    </div>
  );
}

function BadgesMini() {
  return (
    <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {BADGE_LIST.map((badge) => (
        <div key={badge.key} className="flex flex-col items-center text-center">
          <BadgeArt badge={badge.key} className="w-12" />
          <p className="mt-1.5 text-[11px] font-semibold text-foreground">{badge.name}</p>
          <p className="text-[10px] text-muted">{badge.awardedFor.toLowerCase()}</p>
        </div>
      ))}
    </div>
  );
}

export function InsideThePortal() {
  const headerRef = useScrollReveal<HTMLDivElement>({ selector: "[data-reveal]", stagger: 0.1 });
  const gridRef = useScrollReveal<HTMLUListElement>({ selector: "li", stagger: 0.07, y: 20 });

  return (
    <Section id="inside">
      <div ref={headerRef} className="max-w-2xl">
        <SectionKicker data-reveal index="01" label="inside the portal" />
        <SectionTitle data-reveal className="mt-6">
          everything the season leaves behind.
        </SectionTitle>
      </div>

      <ul ref={gridRef} className="mt-12 grid gap-3 md:mt-16 md:grid-cols-6">
        <Card icon={CalendarDays} title="The schedule" line="Four weekends, one topic a day. Claim an open slot in two taps." className="md:col-span-4">
          <ScheduleMini />
        </Card>
        <Card icon={PlayCircle} title="Talks & decks" line="Every talk with its deck, ready to flip through after the session." className="md:col-span-2">
          <DeckMini />
        </Card>
        <Card icon={Gauge} title="Scores out of 10" line="Five parameters and a written note from each of the other nine." className="md:col-span-2">
          <ScoresMini />
        </Card>
        <Card icon={BookMarked} title="Community bookmarks" line="Papers, tools and videos the cohort thought were worth your time." className="md:col-span-2">
          <BookmarksMini />
        </Card>
        <Card icon={PenLine} title="Hearticles" line="Write it up in your own words. No pasting. Approved posts get a public page." className="md:col-span-2">
          <ThoughtsMini />
        </Card>
        <Card icon={Medal} title="Badges" line="Handed out by the curator at the end of the season." className="md:col-span-6">
          <BadgesMini />
        </Card>
      </ul>
    </Section>
  );
}
