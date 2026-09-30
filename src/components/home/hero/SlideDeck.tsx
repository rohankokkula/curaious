"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { COHORT, SLIDE_TOTAL, TONES, initialsFor, type CohortMember } from "@/components/home/hero/cohort";
import { cn } from "@/lib/utils";

/** Where a card sits, by how far it is from the one on stage. Index 2 is
 * the staging slot: invisible, but positioned so cards *slide in* from
 * there rather than popping into the side slot. */
const SLOTS = [
  { xPercent: 0, scale: 1, rotateY: 0, opacity: 1, dim: 0, zIndex: 30 },
  { xPercent: 78, scale: 0.74, rotateY: 30, opacity: 1, dim: 0.55, zIndex: 20 },
  { xPercent: 126, scale: 0.58, rotateY: 34, opacity: 0, dim: 0.72, zIndex: 10 },
];

/** Signed distance from the active index, wrapped so the deck is a loop
 * (card 0 is "next" from card 9, not nine slots away). */
function offsetFrom(index: number, active: number, count: number) {
  const half = Math.floor(count / 2);
  let d = index - active;
  if (d > half) d -= count;
  if (d < -half) d += count;
  return d;
}

function slotFor(offset: number) {
  const dir = Math.sign(offset);
  const slot = SLOTS[Math.min(Math.abs(offset), SLOTS.length - 1)];
  return {
    xPercent: -50 + slot.xPercent * dir,
    scale: slot.scale,
    // negative × dir puts each side card's *outer* edge nearer the viewer,
    // so the row reads as a shallow curved wall, not two flat panels
    rotateY: -slot.rotateY * dir,
    opacity: slot.opacity,
    dim: slot.dim,
    zIndex: slot.zIndex,
  };
}

function CoverArt({ variant }: { variant: number }) {
  const arts = [
    <svg key={0} viewBox="0 0 100 80" preserveAspectRatio="none" className="h-full w-full">
      <rect width={100} height={80} className="fill-emerald-50" />
      <circle cx={72} cy={24} r={21} className="fill-emerald-200/70" />
      <circle cx={46} cy={38} r={16} className="fill-slate-300/50" />
      <path d="M0 80 L24 44 L41 61 L61 33 L100 80 Z" className="fill-slate-800/90" />
    </svg>,
    <svg key={1} viewBox="0 0 100 80" preserveAspectRatio="none" className="h-full w-full">
      <rect width={100} height={80} className="fill-sky-100" />
      <path d="M 22 80 L 22 42 A 28 28 0 0 1 78 42 L 78 80 Z" className="fill-white" />
      <path d="M 36 80 L 36 46 A 14 14 0 0 1 64 46 L 64 80 Z" className="fill-sky-200/70" />
    </svg>,
    <svg key={2} viewBox="0 0 100 80" preserveAspectRatio="none" className="h-full w-full">
      <rect width={100} height={80} className="fill-amber-50" />
      {[14, 26, 38, 50].map((r) => (
        <circle key={r} cx={50} cy={82} r={r} className="fill-none stroke-amber-400/60" strokeWidth={1.5} />
      ))}
    </svg>,
    <svg key={3} viewBox="0 0 100 80" preserveAspectRatio="none" className="h-full w-full">
      <rect width={100} height={80} className="fill-violet-50" />
      {[
        { x: 14, h: 26 },
        { x: 32, h: 44 },
        { x: 50, h: 34 },
        { x: 68, h: 56 },
      ].map((bar) => (
        <rect key={bar.x} x={bar.x} y={72 - bar.h} width={12} height={bar.h} rx={2} className="fill-violet-300/80" />
      ))}
      <rect x={14} y={72} width={72} height={1.5} className="fill-violet-400/60" />
    </svg>,
  ];

  return <div className="h-full w-full overflow-hidden rounded-md">{arts[variant % arts.length]}</div>;
}

function SlideCard({ member, index }: { member: CohortMember; index: number }) {
  const tone = TONES[member.tone % TONES.length];

  return (
    <div className="flex h-full w-full flex-col rounded-xl bg-white p-3 shadow-[0_28px_70px_-18px_rgba(0,0,0,0.85)] md:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.14em] text-slate-400 md:text-[10px]">
            {String(index + 1).padStart(2, "0")} / {SLIDE_TOTAL}
          </span>
          <span aria-hidden className="h-px w-6 bg-slate-200 md:w-10" />
          <span aria-hidden className="flex gap-[3px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={cn("size-[3px] rounded-full", i === 0 ? "bg-slate-400" : "bg-slate-200")}
              />
            ))}
          </span>
        </div>
        <CuraiousLogo className="text-[11px] text-slate-800 md:text-sm" />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 items-center gap-3 md:mt-3 md:gap-5">
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="heading-display text-balance text-[13px] leading-tight text-slate-900 md:text-[26px]">
            {member.talkTitle}
          </h3>
          <p className="mt-1 text-[9px] leading-snug text-slate-500 md:mt-2 md:text-[13px]">
            {member.talkSubtitle}
          </p>

          <div className="mt-auto flex items-center gap-2 pt-2 md:pt-4">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold md:size-8 md:text-[11px]",
                tone.avatar,
              )}
            >
              {initialsFor(member.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-semibold text-slate-800 md:text-[13px]">
                {member.name}
              </p>
              <p className="truncate text-[8px] text-slate-400 md:text-[11px]">{member.role}</p>
            </div>
          </div>
        </div>

        <div className="h-[72%] w-[34%] shrink-0">
          <CoverArt variant={index} />
        </div>
      </div>
    </div>
  );
}

/**
 * A sliding window over the season's talks: every card holds a real slot
 * (centre, either side, or staged just out of frame) and *travels* between
 * them when the speaker changes, so the whole row shifts one seat over
 * instead of the contents swapping in place.
 */
export function SlideDeck({ activeIndex, className }: { activeIndex: number; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dimRefs = useRef<(HTMLDivElement | null)[]>([]);
  const settled = useRef(false);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // first paint (and reduced motion) place cards outright; after that
      // every change is a move between slots
      const instant = !settled.current || reduced;

      COHORT.forEach((_, i) => {
        const card = cardRefs.current[i];
        const dim = dimRefs.current[i];
        if (!card || !dim) return;

        const offset = offsetFrom(i, activeIndex, COHORT.length);
        const { dim: dimAmount, zIndex, ...transform } = slotFor(offset);

        gsap.set(card, { zIndex });

        // cards parked beyond the staging slot are invisible either way —
        // moving them instantly stops them flying across the deck on wrap
        if (instant || Math.abs(offset) > 2) {
          gsap.set(card, transform);
          gsap.set(dim, { opacity: dimAmount });
          return;
        }

        gsap.to(card, { ...transform, duration: 0.62, ease: "power3.inOut", overwrite: "auto" });
        gsap.to(dim, { opacity: dimAmount, duration: 0.62, ease: "power2.out", overwrite: "auto" });
      });

      settled.current = true;
    },
    { scope: rootRef, dependencies: [activeIndex] },
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative h-40 md:h-56", className)}
      style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
    >
      {COHORT.map((member, i) => (
        <div
          key={member.id}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="absolute left-1/2 top-0 h-40 w-52 md:h-56 md:w-96"
          style={{ opacity: 0 }}
        >
          <SlideCard member={member} index={i} />
          <div
            ref={(el) => {
              dimRefs.current[i] = el;
            }}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl bg-[#04040a]"
            style={{ opacity: 0.7 }}
          />
        </div>
      ))}
    </div>
  );
}
