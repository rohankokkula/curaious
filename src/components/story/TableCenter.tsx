"use client";

import { useRef, type RefObject } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  formatSeatNumber,
  getTableCenterLabelPosition,
  TABLE_SEATS,
  USER_SEAT_INDEX,
  WEEKEND_INTRO_LINES,
  type TableCenterMode,
} from "./chapters";
import { CuraiousLogo } from "./CuraiousLogo";
import { cn } from "@/lib/utils";

interface TableCenterProps {
  activeSeatIndex: number;
  centerMode: TableCenterMode;
  showHub: boolean;
  showTopicCard: boolean;
  opacityRef?: RefObject<number>;
  isMobile?: boolean;
}

export function TableCenter({
  activeSeatIndex,
  centerMode,
  showHub,
  showTopicCard,
  opacityRef,
  isMobile = false,
}: TableCenterProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const seat = TABLE_SEATS[activeSeatIndex];
  const isUser = activeSeatIndex === USER_SEAT_INDEX;
  const [x, y, z] = getTableCenterLabelPosition();

  useFrame(() => {
    if (!elementRef.current || !opacityRef) return;
    elementRef.current.style.opacity = String(opacityRef.current ?? 1);
  });

  return (
    <Html
      center
      position={[x, y, z]}
      occlude={false}
      zIndexRange={[100, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div ref={elementRef} className="table-center">
        {showHub && centerMode === "opening" ? (
          <CuraiousLogo className="table-logo" variant="table" />
        ) : null}

        {showHub && centerMode === "weekend" ? (
          <div className="table-weekend-intro">
            {WEEKEND_INTRO_LINES.map((line) => (
              <p key={line} className="table-weekend-line">{line}</p>
            ))}
          </div>
        ) : null}

        {showTopicCard ? (
          <article
            className={cn(
              "seat-topic-card",
              "seat-topic-card--center",
              "seat-topic-card--active",
              isUser && "seat-topic-card--user",
              isMobile && "seat-topic-card--mobile",
            )}
            style={
              {
                "--seat-accent": seat.accent,
                "--seat-glow": seat.glow,
              } as React.CSSProperties
            }
          >
            <header className="seat-topic-card-header">
              <span className="seat-topic-card-number">
                {formatSeatNumber(activeSeatIndex)}
              </span>
              <span className="seat-topic-card-icon" aria-hidden>{seat.icon}</span>
              <span className="seat-topic-card-persona">{seat.persona}</span>
            </header>
            <p className="seat-topic-card-topic">{seat.topic}</p>
          </article>
        ) : null}
      </div>
    </Html>
  );
}
