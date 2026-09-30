"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SpeakerFigure } from "@/components/home/hero/SpeakerFigure";
import { COHORT, TONES, initialsFor, scoreFor } from "@/components/home/hero/cohort";
import { cn } from "@/lib/utils";

/** Seated build, matched to the same person who'd stand up to present. */
const SEATS = {
  m: {
    head: { cy: 15, r: 9 },
    hair: "M 13 13 Q 14 5 22 5 Q 30 5 31 13 Q 27 9 22 9 Q 17 9 13 13 Z",
    shoulder: "M 3 52 Q 5 33 22 30.5 Q 39 33 41 52 Z",
    rim: "M 6.5 46 Q 8.5 34 22 31.5",
  },
  f: {
    head: { cy: 15, r: 8.6 },
    hair: "M 12.5 14 Q 12.5 4 22 4 Q 31.5 4 31.5 14 L 31.5 34 Q 28.5 28 28.5 18 Q 26.5 10 22 10 Q 17.5 10 15.5 18 Q 15.5 28 12.5 34 Z",
    shoulder: "M 6 52 Q 8 34 22 31.5 Q 36 34 38 52 Z",
    rim: "M 9 46 Q 11 35 22 32.5",
  },
} as const;

function Seated({ presents, toneClass }: { presents: "f" | "m"; toneClass: string }) {
  const seat = SEATS[presents];

  return (
    <svg aria-hidden viewBox="0 0 44 52" className={cn("h-full w-full", toneClass)}>
      {/* soft colored bloom, so each person is actually visible against black */}
      <ellipse cx={22} cy={34} rx={18} ry={19} fill="currentColor" opacity={0.07} className="blur-[6px]" />

      <path d={seat.shoulder} fill="#111116" />
      <circle cx={22} cy={seat.head.cy} r={seat.head.r} fill="#111116" />
      <path d={seat.hair} fill="#0b0b0e" />

      {/* rim light thrown back off the stage */}
      <path
        d={`M ${22 - seat.head.r * 0.8} ${seat.head.cy - seat.head.r * 0.55} A ${seat.head.r} ${seat.head.r} 0 0 1 ${22 + seat.head.r * 0.5} ${seat.head.cy - seat.head.r * 0.85}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.75}
      />
      <path d={seat.rim} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

function StarGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("size-2.5", className)} fill="currentColor">
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.3l6.5-.9z" />
    </svg>
  );
}

function StageFloor() {
  return (
    <svg aria-hidden viewBox="0 0 400 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="hero-stage-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#24242c" />
          <stop offset="100%" stopColor="#111116" />
        </linearGradient>
        <radialGradient id="hero-stage-pool" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.17" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={200} cy={72} rx={182} ry={29} fill="#08080c" />
      <ellipse cx={200} cy={60} rx={182} ry={29} fill="url(#hero-stage-top)" />
      <ellipse cx={200} cy={55} rx={150} ry={21} fill="url(#hero-stage-pool)" />
      <ellipse cx={200} cy={60} rx={182} ry={29} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1} />
    </svg>
  );
}

function Podium({ className, toneClass }: { className?: string; toneClass: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 92" className={cn(className, toneClass)}>
      <path d="M 3 13 L 57 13 L 50 21 L 10 21 Z" fill="#1b1b22" />
      <path d="M 11 21 L 49 21 L 45 88 L 15 88 Z" fill="#101015" />
      <rect x={22} y={44} width={16} height={4} rx={2} fill="currentColor" opacity={0.45} />
      <path d="M 49 21 L 45 88" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" opacity={0.55} />
      <path d="M 3 13 L 57 13" fill="none" stroke="currentColor" strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

const FIGURE_SIZE = "h-[4.75rem] w-[2.72rem] md:h-[7.5rem] md:w-[4.29rem]";

/**
 * The room: the stage, and all ten seats in front of it.
 *
 * Every rotation is a handover rather than a swap — whoever just finished
 * walks back down to their own seat while the next person gets up from
 * theirs and crosses to the stage, so the empty seat in the row always
 * belongs to whoever is currently presenting. Seat positions are measured
 * from the DOM rather than hardcoded, so the walk lands correctly at any
 * width.
 */
export function Room({ activeIndex, className }: { activeIndex: number; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const seatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const figureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const walkInRef = useRef<HTMLDivElement>(null);
  const walkOutRef = useRef<HTMLDivElement>(null);

  // Who was on stage last render — needed during render, since the walking
  // figure has to be drawn as *that* person. React's documented
  // previous-value pattern: adjusting state mid-render re-runs this
  // component immediately, before anything commits.
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [renderedIndex, setRenderedIndex] = useState(activeIndex);
  if (renderedIndex !== activeIndex) {
    setPreviousIndex(renderedIndex);
    setRenderedIndex(activeIndex);
  }

  const speaker = COHORT[activeIndex];
  const leaving = COHORT[previousIndex ?? activeIndex];
  const speakerTone = TONES[speaker.tone % TONES.length];
  const leavingTone = TONES[leaving.tone % TONES.length];

  useGSAP(
    () => {
      const from = previousIndex;
      const walkIn = walkInRef.current;
      const walkOut = walkOutRef.current;
      if (!walkIn || !walkOut) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const chips = chipRefs.current.filter(
        (el, i): el is HTMLDivElement => Boolean(el) && i !== activeIndex,
      );

      // the speaker's own chip never shows — nobody scores their own talk
      const ownChip = chipRefs.current[activeIndex];
      if (ownChip) gsap.set(ownChip, { opacity: 0 });

      // measure from the resting stage pose, before any tween offsets it.
      // killing first matters: a handover still in flight would otherwise
      // keep writing transforms and the measurement would be of a walker
      // halfway to a seat.
      gsap.killTweensOf([walkIn, walkOut]);
      gsap.set([walkIn, walkOut], { xPercent: -50, x: 0, y: 0, scale: 1, transformOrigin: "50% 100%" });
      const stageBox = walkIn.getBoundingClientRect();

      const toSeat = (index: number) => {
        const seat = seatRefs.current[index];
        if (!seat) return { x: 0, y: 0 };
        const box = seat.getBoundingClientRect();
        return {
          x: box.left + box.width / 2 - (stageBox.left + stageBox.width / 2),
          y: box.bottom - stageBox.bottom,
        };
      };

      // first paint, or reduced motion: no handover, just place everyone
      if (from === null || from === activeIndex || reduced) {
        gsap.set(walkIn, { opacity: 1 });
        gsap.set(walkOut, { opacity: 0 });
        figureRefs.current.forEach((el, i) => {
          if (el) gsap.set(el, { opacity: i === activeIndex ? 0 : 1 });
        });
        gsap.set(chips, { opacity: 1, y: 0, scale: 1 });
        return;
      }

      const exit = toSeat(from);
      const entrance = toSeat(activeIndex);

      figureRefs.current.forEach((el, i) => {
        if (!el) return;
        // both people in transit are drawn by the walkers, not their seats
        if (i === from || i === activeIndex) return;
        gsap.set(el, { opacity: 1 });
      });
      gsap.set(figureRefs.current[from], { opacity: 0 });
      gsap.set(figureRefs.current[activeIndex], { opacity: 1 });
      gsap.set(chips, { opacity: 0 });

      const tl = gsap.timeline();

      // the one who just presented walks back down to their seat
      tl.set(walkOut, { opacity: 1 }, 0)
        .to(walkOut, { x: exit.x, y: exit.y, scale: 0.4, duration: 0.8, ease: "power2.inOut" }, 0)
        .to(walkOut, { opacity: 0, duration: 0.18 }, 0.66)
        .to(figureRefs.current[from], { opacity: 1, duration: 0.22 }, 0.7);

      // the next one gets up and crosses to the stage
      tl.to(figureRefs.current[activeIndex], { opacity: 0, duration: 0.18 }, 0.12)
        .fromTo(
          walkIn,
          { x: entrance.x, y: entrance.y, scale: 0.4, opacity: 0 },
          { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.85, ease: "power2.inOut" },
          0.2,
        );

      // then the room scores the talk
      tl.fromTo(
        chips,
        { opacity: 0, y: 7, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.36,
          stagger: { each: 0.04, from: "center" },
          ease: "back.out(2.2)",
        },
        1.1,
      );
    },
    { scope: rootRef, dependencies: [activeIndex] },
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* stage, tucked under the screens so the speaker stands in front */}
      <div className="relative z-20 -mt-4 flex justify-center md:-mt-6">
        <div className="relative h-28 w-[19rem] md:h-44 md:w-[32rem]">
          <StageFloor />

          <Podium
            className="absolute bottom-[42%] left-[56%] h-9 w-6 md:h-14 md:w-9"
            toneClass={speakerTone.rim}
          />

          {/* both walkers sit at the same stage mark; GSAP offsets them
              toward a seat and back */}
          <div className="absolute bottom-[42%] left-[43%]">
            <div ref={walkOutRef} className={cn("absolute bottom-0 left-0", FIGURE_SIZE)} style={{ opacity: 0 }}>
              <SpeakerFigure
                className="h-full w-full"
                presents={leaving.presents}
                gesture={leaving.gesture}
                toneClass={leavingTone.rim}
              />
            </div>
            <div ref={walkInRef} className={cn("absolute bottom-0 left-0", FIGURE_SIZE)} style={{ opacity: 0 }}>
              <SpeakerFigure
                className="h-full w-full"
                presents={speaker.presents}
                gesture={speaker.gesture}
                toneClass={speakerTone.rim}
              />
            </div>
          </div>
        </div>
      </div>

      {/* all ten seats — the empty one belongs to whoever is on stage */}
      <div className="relative z-30 -mt-2 flex items-end justify-center gap-1 md:-mt-4 md:gap-2.5">
        {COHORT.map((member, i) => {
          const tone = TONES[member.tone % TONES.length];
          const curve = 1 - ((i - 4.5) / 4.5) ** 2;

          return (
            <div
              key={member.id}
              ref={(el) => {
                seatRefs.current[i] = el;
              }}
              className="flex flex-col items-center"
              style={{ transform: `translateY(${curve * 7}px) scale(${1 + curve * 0.06})` }}
            >
              <div
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                className="mb-1 flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.07] px-1.5 py-[3px] backdrop-blur-sm md:mb-1.5 md:px-2"
                title={`${member.name} scored this talk`}
              >
                <StarGlyph className={tone.chip} />
                <span className="font-mono text-[8px] leading-none text-white/75 md:text-[9px]">
                  {scoreFor(activeIndex, i)}
                </span>
              </div>

              <span className="mb-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-white/25 md:text-[8px]">
                {initialsFor(member.name)}
              </span>

              <div className="relative h-7 w-6 md:h-11 md:w-9">
                {/* the seat itself, showing through whenever it's empty */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-3 rounded-t-md border border-white/8 bg-white/[0.03] md:h-5"
                />
                <div
                  ref={(el) => {
                    figureRefs.current[i] = el;
                  }}
                  className="absolute inset-0"
                >
                  <Seated presents={member.presents} toneClass={tone.rim} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
