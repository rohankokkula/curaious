"use client";

import { useRef, type RefObject } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  FEEDBACK_ROUNDS,
  FEEDBACK_ROUND_COUNT,
  formatAverage,
  getIllustrationAverage,
  getTableCenterLabelPosition,
} from "./chapters";

interface FeedbackCenterProps {
  feedbackRound: number;
  averageProgress?: number;
  opacityRef?: RefObject<number>;
  isMobile?: boolean;
}

export function FeedbackCenter({
  feedbackRound,
  averageProgress = 0,
  opacityRef,
  isMobile = false,
}: FeedbackCenterProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [x, y, z] = getTableCenterLabelPosition();
  const round = FEEDBACK_ROUNDS[feedbackRound] ?? FEEDBACK_ROUNDS[0];
  const showAverage = averageProgress > 0.35;
  const averageScore = getIllustrationAverage();

  useFrame(() => {
    if (!elementRef.current || !opacityRef) return;
    elementRef.current.style.opacity = String(opacityRef.current ?? 1);
  });

  return (
    <Html
      center
      position={[x, y, z]}
      occlude={false}
      zIndexRange={[110, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        ref={elementRef}
        className={`feedback-center${isMobile ? " feedback-center--mobile" : ""}`}
        style={
          {
            "--feedback-accent": round.accent,
            "--feedback-glow": round.glow,
          } as React.CSSProperties
        }
      >
        {showAverage ? (
          <>
            <p className="feedback-center-kicker">round feedback</p>
            <p className="feedback-center-average-value">
              {formatAverage(averageScore)}
            </p>
            <h2 className="feedback-center-title">Your average</h2>
            <p className="feedback-center-question">
              From the other nine seats at the table
            </p>
          </>
        ) : (
          <>
            <div className="feedback-center-meta">
              <span className="feedback-center-kicker">round feedback</span>
              <span className="feedback-center-step">
                {feedbackRound + 1} / {FEEDBACK_ROUND_COUNT}
              </span>
            </div>
            <div className="feedback-center-icon" aria-hidden>{round.icon}</div>
            <h2 className="feedback-center-title">{round.title}</h2>
            <p className="feedback-center-subtitle">{round.subtitle}</p>
            <p className="feedback-center-question">{round.question}</p>
            <div className="feedback-center-dots" aria-hidden>
              {FEEDBACK_ROUNDS.map((_, index) => (
                <span
                  key={index}
                  className={
                    index === feedbackRound
                      ? "feedback-center-dot feedback-center-dot--active"
                      : "feedback-center-dot"
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Html>
  );
}
