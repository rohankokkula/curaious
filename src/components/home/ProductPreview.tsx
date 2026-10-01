"use client";

import { CalendarCheck, Mic, Star, UserRound } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Section } from "@/components/home/Section";
import { COHORT, TONES, initialsFor, scoreFor } from "@/components/home/hero/cohort";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { cn } from "@/lib/utils";

/**
 * "The loop": how one talk moves through a season, as a live flowchart.
 *
 *   claim a slot → present → the other nine score it → it lands on your profile
 *
 * One step lights up at a time and the connector fills toward the next, so
 * the order reads without any copy. Each node animates its own little scene
 * (a slot filling, slides advancing, nine score chips popping in, the
 * average counting up) only while it's the live step. Clicking a step jumps
 * to it. Runs only while on screen, and holds still for reduced motion.
 */

const STEPS = [
  { key: "claim", icon: CalendarCheck, title: "Claim a slot", line: "Pick an open session on the season's schedule." },
  { key: "present", icon: Mic, title: "Present", line: "Your deck, your topic, a room of nine curious people." },
  { key: "score", icon: Star, title: "Nine people score it", line: "Five parameters out of 10, plus written notes. You do the same for them." },
  { key: "profile", icon: UserRound, title: "It lands on your profile", line: "Every score and note, averaged and kept." },
] as const;

const STEP_MS = 3200;

/** You, presenting: the first cohort member; the room is the other nine. */
const YOU = 0;
const ROOM = COHORT.slice(0, 10).map((m, i) => ({ ...m, i })).filter((m) => m.i !== YOU);
const SCORES = ROOM.map((m) => Number(scoreFor(YOU, m.i)));
const AVERAGE = SCORES.reduce((a, b) => a + b, 0) / SCORES.length;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/* ───────────── the four little scenes ───────────── */

/** Three talk weekends, Sat and Sun, two seats a session: some taken, some
 * open, and yours fills in when this step is live. */
const CLAIM_DAYS = [
  { day: "Sat 10", seats: ["AS", "KM"] },
  { day: "Sun 11", seats: ["DI", null] },
  { day: "Sat 17", seats: ["SR", "YOU"] },
  { day: "Sun 18", seats: [null, "VC"] },
  { day: "Sat 24", seats: [null, null] },
  { day: "Sun 25", seats: ["NL", null] },
] as const;

function ClaimScene({ live }: { live: boolean }) {
  return (
    <div className="grid w-full grid-cols-2 gap-1">
      {CLAIM_DAYS.map(({ day, seats }) => (
        <div key={day} className="flex items-center gap-1 rounded-md border border-border/70 bg-surface/60 px-1.5 py-1">
          <span className="w-8 shrink-0 font-mono text-[7px] uppercase leading-none tracking-[0.08em] text-muted">{day}</span>
          {seats.map((seat, k) => {
            const mine = seat === "YOU";
            return (
              <span
                key={k}
                className={cn(
                  "flex h-4 flex-1 items-center justify-center rounded-[3px] border text-[7px] leading-none font-semibold transition-all duration-500",
                  mine
                    ? live
                      ? "scale-105 border-accent bg-accent text-black"
                      : "border-dashed border-border text-transparent"
                    : seat
                      ? "border-border bg-card text-muted"
                      : "border-dashed border-border text-transparent",
                )}
              >
                {mine ? (live ? "you" : "·") : (seat ?? "·")}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PresentScene({ live }: { live: boolean }) {
  const [slide, setSlide] = useState(1);
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setSlide((n) => (n % 12) + 1), 450);
    return () => window.clearInterval(id);
  }, [live]);
  const shown = live ? slide : 1;

  return (
    <div className="w-full max-w-64 md:max-w-none">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border/70 bg-surface/70 p-2">
        <div className="h-1.5 w-1/2 rounded-full bg-foreground/80" />
        <div className="mt-1 h-1 w-1/3 rounded-full bg-foreground/30" />
        <div className="mt-2 flex h-[45%] items-end gap-1">
          {[40, 65, 50, 90, 75].map((h, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-sm transition-all duration-300", i === shown % 5 ? "bg-accent" : "bg-accent/25")}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <span className="absolute right-1.5 bottom-1 font-mono text-[8px] text-muted tabular-nums">
          {String(shown).padStart(2, "0")}/12
        </span>
      </div>
      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-border">
        <span className="block h-full bg-accent transition-[width] duration-300" style={{ width: `${(shown / 12) * 100}%` }} />
      </div>
    </div>
  );
}

function ScoreScene({ live, done }: { live: boolean; done: boolean }) {
  const show = live || done;
  return (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {ROOM.map((member, k) => {
        const tone = TONES[member.tone % TONES.length];
        return (
          <div key={member.id} className="flex flex-col items-center gap-0.5">
            <span
              className={cn(
                "rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-px font-mono text-[9px] leading-tight tabular-nums transition-all duration-300",
                show ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-75 opacity-0",
              )}
              style={{ transitionDelay: live ? `${250 + k * 170}ms` : "0ms" }}
            >
              <span className={tone.chip}>●</span> {SCORES[k]}
            </span>
            <span className="font-mono text-[8px] tracking-[0.1em] text-muted">{initialsFor(member.name)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProfileScene({ live }: { live: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!live) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setValue(AVERAGE * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [live]);
  const shown = live ? value : AVERAGE;

  return (
    <div className="w-full rounded-lg border border-border/70 bg-surface/60 p-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-accent/20 text-[9px] font-semibold text-accent">
          {initialsFor(COHORT[YOU].name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-tight">You</p>
          <p className="truncate text-[9px] text-muted">{COHORT[YOU].talkTitle}</p>
        </div>
      </div>
      <p className="mt-2 text-xl leading-none font-bold tabular-nums">
        {shown.toFixed(1)}
        <span className="text-[11px] font-medium text-muted"> / 10</span>
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${shown * 10}%` }} />
      </div>
      <p
        className={cn(
          "mt-2 line-clamp-2 text-[9px] leading-snug text-muted transition-opacity duration-500",
          live ? "opacity-100 delay-700" : "opacity-70",
        )}
      >
        &ldquo;the demo made the tradeoff click.&rdquo; · 9 notes
      </p>
    </div>
  );
}

/* ───────────── the flow ───────────── */

export function ProductPreview() {
  const revealRef = useScrollReveal<HTMLDivElement>({ selector: "[data-reveal]", stagger: 0.1, y: 18 });
  const flowRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  // Only run while the section is on screen.
  useEffect(() => {
    const el = flowRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = visible && !reduced && !paused;

  useEffect(() => {
    if (!running) return;
    // the last step holds a little longer before the loop starts over
    const id = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), step === STEPS.length - 1 ? STEP_MS * 1.4 : STEP_MS);
    return () => window.clearTimeout(id);
  }, [running, step]);

  // Reduced motion: every scene shown in its finished state, nothing lit.
  const liveStep = reduced ? -1 : step;

  return (
    <Section id="preview">
      <div ref={revealRef}>
        <div data-reveal className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">the loop</p>
          <h2 className="heading-display mt-4 text-balance text-3xl leading-[1.15] md:text-5xl md:leading-[1.1]">
            present once. score nine. get it all back.
          </h2>
        </div>

        <div
          ref={flowRef}
          data-reveal
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="relative mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-4 md:gap-5"
        >
          {STEPS.map((s, i) => {
            const live = i === liveStep;
            const done = reduced || i < step;
            const Icon = s.icon;
            return (
              <div key={s.key} className="relative flex min-w-0 gap-4 md:block">
                {/* connector to the next step: down on phones, across on desktop */}
                {i < STEPS.length - 1 ? (
                  <>
                    <span aria-hidden className="absolute top-12 bottom-[-1rem] left-[1.15rem] w-px bg-border md:hidden">
                      <span
                        className="block w-full bg-accent transition-[height] ease-linear"
                        style={{ height: done ? "100%" : live && running ? "100%" : "0%", transitionDuration: live && running ? `${STEP_MS}ms` : "300ms" }}
                      />
                    </span>
                    <span aria-hidden className="absolute top-[1.15rem] right-[-1.25rem] left-12 hidden h-px bg-border md:block">
                      <span
                        className="block h-full bg-accent transition-[width] ease-linear"
                        style={{ width: done ? "100%" : live && running ? "100%" : "0%", transitionDuration: live && running ? `${STEP_MS}ms` : "300ms" }}
                      />
                    </span>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={live ? "step" : undefined}
                  className={cn(
                    "relative z-10 flex size-[2.3rem] shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                    live
                      ? "scale-110 border-accent bg-accent text-black shadow-[0_0_24px_rgba(224,138,90,0.45)]"
                      : done
                        ? "border-accent/60 bg-accent/15 text-accent"
                        : "border-border bg-card text-muted",
                  )}
                >
                  <Icon className="size-4" />
                </button>

                <div className="min-w-0 flex-1 pb-4 md:pb-0">
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted md:mt-4">step {i + 1}</p>
                  <h3 className={cn("mt-1 text-base font-semibold transition-colors", live ? "text-foreground" : "text-foreground/80")}>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted md:min-h-[4.5rem]">{s.line}</p>

                  <div
                    className={cn(
                      "mt-3 flex min-h-[7.5rem] items-center rounded-xl border p-3 transition-all duration-500 md:h-36",
                      live ? "border-accent/50 bg-card shadow-[0_0_0_1px_rgba(224,138,90,0.15)]" : "border-border/60 bg-card/60",
                      !live && !done && "opacity-60",
                    )}
                  >
                    {s.key === "claim" ? <ClaimScene live={live || done} /> : null}
                    {s.key === "present" ? <PresentScene live={live} /> : null}
                    {s.key === "score" ? <ScoreScene live={live} done={done} /> : null}
                    {s.key === "profile" ? <ProfileScene live={live} /> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </Section>
  );
}
