"use client";

import { useRef, type RefObject } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  formatScore,
  getFocusSceneFade,
  getScoreLabelPosition,
  getSeatAccent,
  USER_SEAT_INDEX,
} from "./chapters";

interface SeatScoreLabelsProps {
  scores: Array<number | null>;
  activeSeatIndex: number;
  averageProgress?: number;
  focusProgressRef?: RefObject<number>;
}

export function SeatScoreLabels({
  scores,
  activeSeatIndex,
  averageProgress = 0,
  focusProgressRef,
}: SeatScoreLabelsProps) {
  const fadeOutT = Math.min(1, averageProgress / 0.5);
  const baseScoreOpacity = Math.max(0.35, 1 - fadeOutT * 0.25);

  return (
    <>
      {scores.map((score, index) =>
        score === null ||
        index === USER_SEAT_INDEX ||
        index !== activeSeatIndex ? null : (
          <SeatScorePill
            key={index}
            seatIndex={index}
            score={score}
            isActive={index === activeSeatIndex}
            baseOpacity={baseScoreOpacity}
            focusProgressRef={focusProgressRef}
          />
        ),
      )}
    </>
  );
}

function SeatScorePill({
  seatIndex,
  score,
  isActive,
  baseOpacity,
  focusProgressRef,
}: {
  seatIndex: number;
  score: number;
  isActive: boolean;
  baseOpacity: number;
  focusProgressRef?: RefObject<number>;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const seat = getSeatAccent(seatIndex);
  const position = getScoreLabelPosition(seatIndex);

  useFrame(() => {
    if (!elementRef.current) return;
    const focusFade = getFocusSceneFade(focusProgressRef?.current ?? 0);
    const opacity = Math.max(0, baseOpacity * (1 - focusFade * 0.85));
    elementRef.current.style.opacity = String(opacity);
    elementRef.current.style.display = opacity <= 0.02 ? "none" : "flex";
  });

  if (baseOpacity <= 0.02) return null;

  return (
    <Html
      center
      position={position}
      occlude={false}
      zIndexRange={[isActive ? 115 : 95, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        ref={elementRef}
        className={`score-pill${isActive ? " score-pill--active" : ""}`}
        style={
          {
            "--seat-accent": seat.accent,
            "--seat-glow": seat.glow,
          } as React.CSSProperties
        }
      >
        {formatScore(score)}
      </div>
    </Html>
  );
}
