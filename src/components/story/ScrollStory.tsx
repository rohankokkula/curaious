"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  FEEDBACK_ROUND_COUNT,
  ILLUSTRATION_SCORES,
  PREAMBLE_SCROLL_STEPS,
  SEAT_COUNT,
  TABLE_SEATS,
  SCORING_SEAT_COUNT,
  USER_SEAT_INDEX,
  getIllustrationScore,
  getIllustrationAverage,
  getFocusSplitProgress,
  type StoryPhase,
  type TableCenterMode,
} from "./chapters";
import { FORM_STEPS, type FormStepId } from "@/lib/types";
import { StoryChrome } from "./StoryChrome";

const TableScene = dynamic(
  () => import("./TableScene").then((mod) => mod.TableScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <p className="story-whisper">loading the table...</p>
      </div>
    ),
  },
);

const ApplyCanvas = dynamic(
  () => import("@/components/application/ApplyCanvas").then((mod) => mod.ApplyCanvas),
  { ssr: false },
);

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SEAT_SCROLL_VH = 22;
/** Small scroll buffer after the yellow handoff before intro copy begins. */
const TRANSITION_SCROLL_VH = 8;
/** More scroll distance per step once the table is top-down so lines can be read. */
const READING_SCROLL_VH = 50;

const SEAT_SCROLL_STEPS = PREAMBLE_SCROLL_STEPS + SEAT_COUNT;
const TRANSITION_SCROLL_STEPS = 1;
const INTRO_SCROLL_STEPS = 1 + SEAT_COUNT;
const SCORE_SCROLL_STEPS = SCORING_SEAT_COUNT;
const AVERAGE_SCROLL_VH = READING_SCROLL_VH * 1.4;
const FORM_STEP_SCROLL_VH = 32;
const FORM_SCROLL_DISTANCE = FORM_STEPS.length * FORM_STEP_SCROLL_VH;
const POST_AVERAGE_SCROLL_DISTANCE = FORM_SCROLL_DISTANCE;
const FOCUS_TRANSITION_DURATION = 3.4;
const VIEW_TRANSITION_DURATION = 5.2;

const SEAT_SCROLL_DISTANCE = SEAT_SCROLL_STEPS * SEAT_SCROLL_VH;
const TRANSITION_SCROLL_DISTANCE =
  TRANSITION_SCROLL_STEPS * TRANSITION_SCROLL_VH;
const INTRO_SCROLL_DISTANCE = INTRO_SCROLL_STEPS * READING_SCROLL_VH;
const SCORE_SCROLL_DISTANCE = SCORE_SCROLL_STEPS * READING_SCROLL_VH;
const AVERAGE_SCROLL_DISTANCE = AVERAGE_SCROLL_VH;
const TOTAL_SCROLL_VH =
  SEAT_SCROLL_DISTANCE +
  TRANSITION_SCROLL_DISTANCE +
  INTRO_SCROLL_DISTANCE +
  SCORE_SCROLL_DISTANCE +
  AVERAGE_SCROLL_DISTANCE +
  POST_AVERAGE_SCROLL_DISTANCE;

/** Yellow chair replaces product thinker near the end of the final seat beat. */
const LAST_SEAT_YELLOW_HANDOFF_FRACTION = 0.48;

const SEAT_PHASE_END = SEAT_SCROLL_DISTANCE / TOTAL_SCROLL_VH;
const FINALE_YELLOW_START =
  SEAT_PHASE_END *
  ((SEAT_SCROLL_STEPS - 1 + LAST_SEAT_YELLOW_HANDOFF_FRACTION) /
    SEAT_SCROLL_STEPS);
const TRANSITION_PHASE_END =
  (SEAT_SCROLL_DISTANCE + TRANSITION_SCROLL_DISTANCE) / TOTAL_SCROLL_VH;
const INTRO_PHASE_END =
  (SEAT_SCROLL_DISTANCE +
    TRANSITION_SCROLL_DISTANCE +
    INTRO_SCROLL_DISTANCE) /
  TOTAL_SCROLL_VH;
const SCORES_PHASE_END =
  (SEAT_SCROLL_DISTANCE +
    TRANSITION_SCROLL_DISTANCE +
    INTRO_SCROLL_DISTANCE +
    SCORE_SCROLL_DISTANCE) /
  TOTAL_SCROLL_VH;
const AVERAGE_PHASE_END =
  (SEAT_SCROLL_DISTANCE +
    TRANSITION_SCROLL_DISTANCE +
    INTRO_SCROLL_DISTANCE +
    SCORE_SCROLL_DISTANCE +
    AVERAGE_SCROLL_DISTANCE) /
  TOTAL_SCROLL_VH;
/** Fast scroll past average snaps the chair view instead of leaving it mid-transition. */
const FOCUS_SNAP_PORTION = 0.06;

export type { StoryPhase } from "./chapters";

interface StoryState {
  phase: StoryPhase;
  activeSeatIndex: number;
  centerMode: TableCenterMode;
  feedbackRound: number;
  viewTarget: number;
  revealedScores: Array<number | null>;
  averageProgress: number;
  focusProgress: number;
  formStep: FormStepId | null;
}

function getSeatPhaseState(seatProgress: number): StoryState {
  const step = Math.min(
    SEAT_SCROLL_STEPS - 1,
    Math.floor(seatProgress * SEAT_SCROLL_STEPS),
  );

  if (step === 0) {
    return {
      phase: "seats",
      activeSeatIndex: USER_SEAT_INDEX,
      centerMode: "opening",
      feedbackRound: 0,
      viewTarget: 0,
      revealedScores: Array<number | null>(SEAT_COUNT).fill(null),
      averageProgress: 0,
      focusProgress: 0,
      formStep: null,
    };
  }

  if (step === 1) {
    return {
      phase: "seats",
      activeSeatIndex: USER_SEAT_INDEX,
      centerMode: "weekend",
      feedbackRound: 0,
      viewTarget: 0,
      revealedScores: Array<number | null>(SEAT_COUNT).fill(null),
      averageProgress: 0,
      focusProgress: 0,
      formStep: null,
    };
  }

  const topicIndex = step - PREAMBLE_SCROLL_STEPS;
  return {
    phase: "seats",
    activeSeatIndex: topicIndex,
    centerMode: "topic",
    feedbackRound: 0,
    viewTarget: 0,
    revealedScores: Array<number | null>(SEAT_COUNT).fill(null),
    averageProgress: 0,
    focusProgress: 0,
    formStep: null,
  };
}

function getStoryState(progress: number): StoryState {
  if (progress < FINALE_YELLOW_START) {
    const seatProgress = progress / FINALE_YELLOW_START;
    return getSeatPhaseState(seatProgress);
  }

  if (progress < TRANSITION_PHASE_END) {
    return getFinaleState();
  }

  if (progress < INTRO_PHASE_END) {
    const raw =
      (progress - TRANSITION_PHASE_END) / (INTRO_PHASE_END - TRANSITION_PHASE_END);
    const introStep = Math.min(
      INTRO_SCROLL_STEPS - 1,
      Math.floor(raw * INTRO_SCROLL_STEPS),
    );

    if (introStep === 0) {
      return {
        phase: "intro",
        activeSeatIndex: USER_SEAT_INDEX,
        centerMode: "weekend",
        feedbackRound: 0,
        viewTarget: 1,
        revealedScores: Array<number | null>(SEAT_COUNT).fill(null),
        averageProgress: 0,
        focusProgress: 0,
        formStep: null,
      };
    }

    const topicIndex = introStep - 1;
    return {
      phase: "intro",
      activeSeatIndex: topicIndex,
      centerMode: "topic",
      feedbackRound: 0,
      viewTarget: 1,
      revealedScores: Array<number | null>(SEAT_COUNT).fill(null),
      averageProgress: 0,
      focusProgress: 0,
      formStep: null,
    };
  }

  const allRevealedScores = Array<number | null>(SEAT_COUNT)
    .fill(null)
    .map((_, index) => getIllustrationScore(index));

  if (progress < SCORES_PHASE_END) {
    const raw = clamp01(
      (progress - INTRO_PHASE_END) / (SCORES_PHASE_END - INTRO_PHASE_END),
    );
    const scoreStep = Math.min(
      SCORING_SEAT_COUNT - 1,
      Math.floor(raw * SCORING_SEAT_COUNT),
    );
    const scoreSeatIndex = scoreStep + 1;
    const feedbackRound = Math.min(
      FEEDBACK_ROUND_COUNT - 1,
      Math.floor(raw * FEEDBACK_ROUND_COUNT),
    );

    return {
      phase: "scores",
      activeSeatIndex: scoreSeatIndex,
      centerMode: "topic",
      feedbackRound,
      viewTarget: 1,
      revealedScores: allRevealedScores,
      averageProgress: 0,
      focusProgress: 0,
      formStep: null,
    };
  }

  if (progress < AVERAGE_PHASE_END) {
    const raw = clamp01(
      (progress - SCORES_PHASE_END) / (AVERAGE_PHASE_END - SCORES_PHASE_END),
    );
    const averageAnim = clamp01(raw / 0.7);

    return {
      phase: "average",
      activeSeatIndex: USER_SEAT_INDEX,
      centerMode: "topic",
      feedbackRound: FEEDBACK_ROUND_COUNT - 1,
      viewTarget: 1,
      revealedScores: allRevealedScores,
      averageProgress: smoothStep(averageAnim),
      focusProgress: 0,
      formStep: null,
    };
  }

  const postRaw = clamp01(
    (progress - AVERAGE_PHASE_END) / (1 - AVERAGE_PHASE_END),
  );

  const formRaw = postRaw;
  const formStepIndex = Math.min(
    FORM_STEPS.length - 1,
    Math.floor(formRaw * FORM_STEPS.length),
  );

  return {
    phase: "form",
    activeSeatIndex: USER_SEAT_INDEX,
    centerMode: "topic",
    feedbackRound: FEEDBACK_ROUND_COUNT - 1,
    viewTarget: 1,
    revealedScores: allRevealedScores,
    averageProgress: 1,
    focusProgress: 1,
    formStep: FORM_STEPS[formStepIndex],
  };
}

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scenePanelRef = useRef<HTMLDivElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const viewProgressRef = useRef(0);
  const focusProgressRef = useRef(0);
  const scrollProgressRef = useRef(0);
  const viewDriverRef = useRef({ value: 0 });
  const focusDriverRef = useRef({ value: 0 });
  const viewAnimStartedRef = useRef(false);
  const focusAnimStartedRef = useRef(false);
  const viewTweenRef = useRef<gsap.core.Tween | null>(null);
  const focusTweenRef = useRef<gsap.core.Tween | null>(null);
  const storySnapshotRef = useRef("");
  const [formPanelReady, setFormPanelReady] = useState(false);
  const [story, setStory] = useState<StoryState>(() => getStoryState(0));

  function updateSplitLayout(focusProgress: number, phase: StoryPhase) {
    const split =
      phase === "form"
        ? 1
        : phase === "focus"
          ? getFocusSplitProgress(focusProgress)
          : 0;

    if (scenePanelRef.current) {
      scenePanelRef.current.style.transform = `translate3d(${-split * 25}%, 0, 0)`;
    }
    if (formPanelRef.current) {
      formPanelRef.current.style.transform = `translate3d(${(1 - split) * 100}%, 0, 0)`;
      formPanelRef.current.style.opacity = String(clamp01(split * 1.05));
      formPanelRef.current.style.pointerEvents =
        split > 0.18 ? "auto" : "none";
    }
  }

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useGSAP(
    () => {
      if (!scrollTrackRef.current || !stageRef.current) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const resetViewAnimation = () => {
        viewTweenRef.current?.kill();
        viewTweenRef.current = null;
        viewAnimStartedRef.current = false;
        viewDriverRef.current.value = 0;
        viewProgressRef.current = 0;
        if (veilRef.current) {
          veilRef.current.style.opacity = "0";
        }
      };

      const resetFocusAnimation = () => {
        focusTweenRef.current?.kill();
        focusTweenRef.current = null;
        focusAnimStartedRef.current = false;
        focusDriverRef.current.value = 0;
        focusProgressRef.current = 0;
        setFormPanelReady(false);
        if (scenePanelRef.current) {
          scenePanelRef.current.style.transform = "translate3d(0, 0, 0)";
        }
        if (formPanelRef.current) {
          formPanelRef.current.style.transform = "translate3d(100%, 0, 0)";
          formPanelRef.current.style.opacity = "0";
          formPanelRef.current.style.pointerEvents = "none";
        }
      };

      const completeFocusAnimation = () => {
        focusTweenRef.current?.kill();
        focusTweenRef.current = null;
        focusAnimStartedRef.current = true;
        focusDriverRef.current.value = 1;
        focusProgressRef.current = 1;
      };

      const getLayoutPhase = (next: StoryState): StoryPhase => {
        if (next.phase === "form") return "form";
        if (scrollProgressRef.current >= AVERAGE_PHASE_END) return "focus";
        return next.phase;
      };

      const commitStoryState = (merged: StoryState) => {
        const snapshot = [
          merged.phase,
          merged.formStep,
          merged.activeSeatIndex,
          merged.centerMode,
          merged.feedbackRound,
          merged.viewTarget,
          Math.round(merged.averageProgress * 100),
          merged.revealedScores.join(","),
        ].join("|");

        if (snapshot === storySnapshotRef.current) return;
        storySnapshotRef.current = snapshot;
        setStory(merged);
      };

      const syncFocusPresentation = (
        next: StoryState,
        options: { layoutOnly?: boolean } = {},
      ) => {
        const focusValue = focusDriverRef.current.value;
        focusProgressRef.current = focusValue;

        const layoutPhase = getLayoutPhase(next);
        updateSplitLayout(focusValue, layoutPhase);

        if (options.layoutOnly) return;

        const merged: StoryState = {
          ...next,
          focusProgress: focusValue,
          phase:
            next.phase === "form"
              ? "form"
              : scrollProgressRef.current >= AVERAGE_PHASE_END
                ? "focus"
                : next.phase,
        };

        commitStoryState(merged);
      };

      const startViewAnimation = () => {
        if (viewAnimStartedRef.current) return;
        viewAnimStartedRef.current = true;
        viewDriverRef.current.value = 0;

        if (prefersReducedMotion) {
          viewDriverRef.current.value = 1;
          viewProgressRef.current = 1;
          if (veilRef.current) {
            veilRef.current.style.opacity = "0";
          }
          return;
        }

        viewTweenRef.current = gsap.to(viewDriverRef.current, {
          value: 1,
          duration: VIEW_TRANSITION_DURATION,
          ease: "power2.inOut",
          onUpdate: () => {
            viewProgressRef.current = viewDriverRef.current.value;
            if (veilRef.current) {
              veilRef.current.style.opacity = String(
                transitionVeilOpacity(viewDriverRef.current.value),
              );
            }
          },
          onComplete: () => {
            viewProgressRef.current = 1;
            if (veilRef.current) {
              veilRef.current.style.opacity = "0";
            }
          },
        });
      };

      const startFocusAnimation = () => {
        if (focusAnimStartedRef.current) return;
        focusAnimStartedRef.current = true;
        setFormPanelReady(true);

        if (prefersReducedMotion) {
          focusDriverRef.current.value = 1;
          syncFocusPresentation(getStoryState(scrollProgressRef.current));
          return;
        }

        focusTweenRef.current = gsap.to(focusDriverRef.current, {
          value: 1,
          duration: FOCUS_TRANSITION_DURATION,
          ease: "none",
          onUpdate: () => {
            syncFocusPresentation(
              getStoryState(scrollProgressRef.current),
              { layoutOnly: true },
            );
          },
          onComplete: () => {
            syncFocusPresentation(getStoryState(scrollProgressRef.current));
          },
        });

        syncFocusPresentation(getStoryState(scrollProgressRef.current));
      };

      ScrollTrigger.create({
        trigger: scrollTrackRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: stageRef.current,
        pinSpacing: true,
        scrub: prefersReducedMotion ? false : true,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
          const next = getStoryState(self.progress);

          if (self.progress < FINALE_YELLOW_START) {
            resetViewAnimation();
          } else if (!viewAnimStartedRef.current) {
            startViewAnimation();
          } else {
            viewProgressRef.current = viewDriverRef.current.value;
          }

          if (self.progress < SCORES_PHASE_END) {
            resetFocusAnimation();
          } else if (self.progress >= AVERAGE_PHASE_END) {
            if (!focusAnimStartedRef.current) {
              startFocusAnimation();
            }

            const postAverageSpan = 1 - AVERAGE_PHASE_END;
            const snapThreshold =
              AVERAGE_PHASE_END + postAverageSpan * FOCUS_SNAP_PORTION;
            if (
              self.progress >= snapThreshold &&
              focusDriverRef.current.value < 1
            ) {
              completeFocusAnimation();
            }
          }

          syncFocusPresentation(next);
        },
      });

      return () => {
        viewTweenRef.current?.kill();
        focusTweenRef.current?.kill();
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      };
    },
    { scope: containerRef, revertOnUpdate: true },
  );

  const showHub =
    story.phase === "seats" ||
    story.phase === "transition" ||
    story.phase === "intro";
  const showTopicCard =
    (story.phase === "seats" || story.phase === "intro") &&
    story.centerMode === "topic";
  const showFeedback =
    story.phase === "scores" || story.phase === "average";
  const showForm = story.phase === "form" && story.formStep !== null;

  return (
    <div ref={containerRef} className="relative bg-background">
      <div
        ref={scrollTrackRef}
        className="relative"
        style={{
          height: `${TOTAL_SCROLL_VH}vh`,
        }}
      >
        <div
          ref={stageRef}
          className="relative h-screen w-full overflow-hidden bg-background"
        >
          <div className="relative h-full w-full overflow-hidden">
            <StoryChrome visible={showFeedback} />
            <div
              ref={scenePanelRef}
              className="absolute inset-0 h-full w-full will-change-transform"
              style={{ transform: "translate3d(0, 0, 0)" }}
            >
              <TableScene
                activeSeatIndex={story.activeSeatIndex}
                centerMode={story.centerMode}
                showHub={showHub}
                showTopicCard={showTopicCard}
                showFeedback={showFeedback}
                feedbackRound={story.feedbackRound}
                storyPhase={story.phase}
                showScores={
                  story.phase === "scores" ||
                  story.phase === "average" ||
                  story.phase === "focus"
                }
                revealedScores={story.revealedScores}
                averageProgress={story.averageProgress}
                focusProgress={story.focusProgress}
                focusProgressRef={focusProgressRef}
                viewProgressRef={viewProgressRef}
              />
            </div>

            <div
              ref={formPanelRef}
              className="absolute inset-y-0 right-0 z-20 h-full w-1/2 overflow-hidden border-l border-border/20 bg-background will-change-transform"
              style={{
                transform: "translate3d(100%, 0, 0)",
                opacity: 0,
                pointerEvents: "none",
              }}
            >
              {formPanelReady ? (
                <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
                  <div className="grid min-h-full w-full place-content-center px-4 py-8 md:px-6 md:py-10">
                    {showForm ? (
                      <ApplyCanvas
                        embedded
                        scrollDriven
                        scrollStep={story.formStep}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div
            ref={veilRef}
            className="pointer-events-none absolute inset-0 z-10 bg-background"
            style={{ opacity: 0 }}
            aria-hidden
          />
        </div>
      </div>

      <div className="sr-only">
        {TABLE_SEATS.map((seat, index) => (
          <p key={seat.persona}>
            seat {index + 1}: {seat.persona} — {seat.topic}
          </p>
        ))}
        {ILLUSTRATION_SCORES.map((score, index) => (
          <p key={`score-${index}`}>
            seat {index + 2} score: {score} out of 10
          </p>
        ))}
        <p>average score: {getIllustrationAverage()} out of 10</p>
      </div>
    </div>
  );
}

function getFinaleState(): StoryState {
  return {
    phase: "transition",
    activeSeatIndex: USER_SEAT_INDEX,
    centerMode: "opening",
    feedbackRound: 0,
    viewTarget: 1,
    revealedScores: Array<number | null>(SEAT_COUNT).fill(null),
    averageProgress: 0,
    focusProgress: 0,
    formStep: null,
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothStep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function transitionVeilOpacity(view: number) {
  if (view <= 0.04 || view >= 0.96) return 0;
  return Math.sin(view * Math.PI) * 0.38;
}
