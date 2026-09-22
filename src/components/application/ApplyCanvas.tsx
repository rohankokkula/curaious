"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProgress } from "@/components/application/FormProgress";
import {
  ChoiceOption,
  FormActions,
  FormField,
  FormQuestion,
  FormShell,
  LargeInput,
  LargeTextarea,
} from "@/components/application/FormControls";
import type {
  ApplicationFormData,
  CurrentStage,
  FormStepId,
  WeekendCommitment,
} from "@/lib/types";
import { EMPTY_APPLICATION, FORM_STEPS } from "@/lib/types";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import {
  COMMITMENT_LABELS,
  STAGE_LABELS,
  cn,
  getFirstName,
} from "@/lib/utils";
import { validateStep } from "@/lib/validation";

const presentationExamples = [
  "how i would approach a messy dataset",
  "why XGBoost still matters",
  "what i learned while building an AI agent",
  "an LLM concept i finally understood",
  "something i'm still trying to understand",
];

const contributionHints = [
  "a perspective.",
  "a skill.",
  "a difficult question.",
  "a project.",
  "a willingness to help.",
];

function getNextStep(step: FormStepId): FormStepId {
  const index = FORM_STEPS.indexOf(step);
  return FORM_STEPS[index + 1] || step;
}

function getPreviousStep(step: FormStepId): FormStepId {
  const index = FORM_STEPS.indexOf(step);
  return FORM_STEPS[Math.max(1, index - 1)] || step;
}

export function ApplyCanvas({
  embedded = false,
  scrollDriven = false,
  scrollStep = null,
}: {
  embedded?: boolean;
  scrollDriven?: boolean;
  scrollStep?: FormStepId | null;
}) {
  const [currentStep, setCurrentStep] = useState<FormStepId>("name");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [data, setData] = useState<ApplicationFormData>(EMPTY_APPLICATION);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ApplicationFormData, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [draftReady, setDraftReady] = useState(false);

  const firstName = useMemo(() => getFirstName(data.fullName), [data.fullName]);
  const displayStep =
    scrollDriven && scrollStep ? scrollStep : currentStep;
  const showDraftMessage =
    draftReady && displayStep !== "confirmation" && !scrollDriven;
  const showScrollHint =
    scrollDriven &&
    displayStep !== "review" &&
    displayStep !== "confirmation";

  useEffect(() => {
    if (!scrollDriven || !scrollStep || scrollStep === currentStep) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- optional scroll-driven mode syncs the step from a parent-owned scroll position
    setCurrentStep(scrollStep);
    setDirection("forward");
  }, [scrollDriven, scrollStep, currentStep]);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      /* eslint-disable react-hooks/set-state-in-effect -- hydrate saved draft from localStorage after mount */
      setData(draft.data);
      const step =
        draft.currentStep === "confirmation" || draft.currentStep === "intro"
          ? "review"
          : draft.currentStep;
      setCurrentStep(step);
      setDraftReady(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady || currentStep === "confirmation") return;
    saveDraft({
      data,
      currentStep,
      updatedAt: new Date().toISOString(),
    });
  }, [data, currentStep, draftReady]);

  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((value) => (value + 1) % presentationExamples.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateField = useCallback(
    <K extends keyof ApplicationFormData>(
      key: K,
      value: ApplicationFormData[K],
    ) => {
      setData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const goForward = useCallback(
    (step: FormStepId = currentStep) => {
      const stepErrors = validateStep(step, data);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return false;
      }

      setDirection("forward");
      setCurrentStep(getNextStep(step));
      setSubmitError(null);
      if (!embedded) {
        window.scrollTo({
          top: document.getElementById("apply")?.offsetTop ?? 0,
          behavior: "smooth",
        });
      }
      return true;
    },
    [currentStep, data, embedded],
  );

  const goBack = useCallback(() => {
    setDirection("back");
    setCurrentStep(getPreviousStep(currentStep));
    setSubmitError(null);
  }, [currentStep]);

  const jumpToStep = useCallback((step: FormStepId) => {
    setDirection("back");
    setCurrentStep(step);
    setSubmitError(null);
  }, []);

  const handleSubmit = async () => {
    const stepErrors = validateStep("agreement", data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      jumpToStep("agreement");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        applicationId?: string;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        setSubmitError(
          result.message ||
            "something went wrong while saving your application. please try again.",
        );
        return;
      }

      clearDraft();
      setApplicationId(result.applicationId || null);
      setDirection("forward");
      setCurrentStep("confirmation");
    } catch {
      setSubmitError(
        "something went wrong while saving your application. please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hideStepActions = scrollDriven && displayStep !== "review";

  const renderStep = () => {
    switch (displayStep) {
      case "intro":
        return (
          <FormShell direction={direction}>
            <FormQuestion>want to own this seat?</FormQuestion>
            {showScrollHint ? (
              <p className="text-sm text-muted">keep scrolling to apply.</p>
            ) : (
              <FormActions
                onNext={() => goForward("intro")}
                showBack={false}
                nextLabel="yes"
              />
            )}
          </FormShell>
        );

      case "name":
        return (
          <FormShell direction={direction}>
            <LargeInput
              label="first, what should we call you?"
              name="fullName"
              value={data.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !scrollDriven) {
                  event.preventDefault();
                  goForward("name");
                }
              }}
              autoComplete="name"
              placeholder="your name"
              error={errors.fullName}
            />
            {data.fullName.trim() ? (
              <p className="text-xs text-muted">
                good to meet you, {firstName.toLowerCase()}.
              </p>
            ) : null}
            {!hideStepActions ? (
              <FormActions
                onNext={() => goForward("name")}
                showBack={false}
              />
            ) : null}
          </FormShell>
        );

      case "contact":
        return (
          <FormShell direction={direction}>
            <FormQuestion>
              {firstName
                ? `okay ${firstName.toLowerCase()}, how do we reach you?`
                : "how do we reach you?"}
            </FormQuestion>
            <div className="space-y-4">
              <FormField
                label="email"
                id="email"
                type="email"
                value={data.email}
                onChange={(event) => updateField("email", event.target.value)}
                autoComplete="email"
                error={errors.email}
              />
              <FormField
                label="linkedin"
                id="linkedin"
                type="url"
                value={data.linkedinUrl}
                onChange={(event) =>
                  updateField("linkedinUrl", event.target.value)
                }
                placeholder="https://linkedin.com/in/..."
                error={errors.linkedinUrl}
              />
            </div>
            {!hideStepActions ? (
              <FormActions onBack={goBack} onNext={() => goForward("contact")} />
            ) : null}
          </FormShell>
        );

      case "location":
        return (
          <FormShell direction={direction}>
            <FormQuestion>where are you joining us from?</FormQuestion>
            <FormField
              label="location"
              value={data.currentLocation}
              onChange={(event) =>
                updateField("currentLocation", event.target.value)
              }
              placeholder="city, area, or neighbourhood"
              error={errors.currentLocation}
            />
            <div className="space-y-0">
              {(
                [
                  ["in_hyderabad", "already in hyderabad"],
                  ["nearby_can_travel", "nearby and can travel regularly"],
                  ["elsewhere", "somewhere else"],
                ] as const
              ).map(([value, label]) => (
                <ChoiceOption
                  key={value}
                  selected={data.hyderabadAvailability === value}
                  onSelect={() => updateField("hyderabadAvailability", value)}
                  title={label}
                />
              ))}
            </div>
            {errors.hyderabadAvailability ? (
              <p className="text-sm text-accent">
                {errors.hyderabadAvailability}
              </p>
            ) : null}
            {!hideStepActions ? (
              <FormActions onBack={goBack} onNext={() => goForward("location")} />
            ) : null}
          </FormShell>
        );

      case "stage":
        return (
          <FormShell direction={direction}>
            <FormQuestion>where are you right now?</FormQuestion>
            <div>
              {(Object.entries(STAGE_LABELS) as [CurrentStage, string][]).map(
                ([value, label]) => (
                  <ChoiceOption
                    key={value}
                    selected={data.currentStage === value}
                    onSelect={() => updateField("currentStage", value)}
                    title={label}
                  />
                ),
              )}
            </div>
            {errors.currentStage ? (
              <p className="text-sm text-accent">{errors.currentStage}</p>
            ) : null}
            {!hideStepActions ? (
              <FormActions onBack={goBack} onNext={() => goForward("stage")} />
            ) : null}
          </FormShell>
        );

      case "currentWork":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label="what does your week usually look like right now?"
              helper="optional, but helpful if you want to add context."
              name="currentWork"
              value={data.currentWork}
              onChange={(event) =>
                updateField("currentWork", event.target.value)
              }
            />
            {!hideStepActions ? (
              <FormActions
                onBack={goBack}
                onNext={() => goForward("currentWork")}
                nextLabel={data.currentWork.trim() ? "continue" : "skip for now"}
              />
            ) : null}
          </FormShell>
        );

      case "aiJourney":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label="tell me where you are with AI right now."
              helper="there's no right answer here. you could be training models, experimenting with agents or just trying to figure out where to begin."
              name="aiJourney"
              value={data.aiJourney}
              onChange={(event) =>
                updateField("aiJourney", event.target.value)
              }
              error={errors.aiJourney}
            />
            {!hideStepActions ? (
              <FormActions onBack={goBack} onNext={() => goForward("aiJourney")} />
            ) : null}
          </FormShell>
        );

      case "building":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label="what has been taking up space in your head lately?"
              helper="something you're building, learning, trying to solve, or an idea you keep coming back to."
              name="currentlyLearningOrBuilding"
              value={data.currentlyLearningOrBuilding}
              onChange={(event) =>
                updateField("currentlyLearningOrBuilding", event.target.value)
              }
              error={errors.currentlyLearningOrBuilding}
            />
            {!hideStepActions ? (
              <FormActions onBack={goBack} onNext={() => goForward("building")} />
            ) : null}
          </FormShell>
        );

      case "presentation":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label="imagine it's your turn at the table. what would you talk about?"
              helper={
                <span className="font-mono text-sm">
                  e.g. {presentationExamples[exampleIndex]}
                </span>
              }
              name="presentationTopic"
              value={data.presentationTopic}
              onChange={(event) =>
                updateField("presentationTopic", event.target.value)
              }
              error={errors.presentationTopic}
            />
            {!hideStepActions ? (
              <FormActions
                onBack={goBack}
                onNext={() => goForward("presentation")}
              />
            ) : null}
          </FormShell>
        );

      case "learn":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label={
                <>
                  now flip the table.
                  <span className="mt-2 block text-lg md:text-xl">
                    what do you wish someone would explain to you properly?
                  </span>
                </>
              }
              name="topicToLearn"
              value={data.topicToLearn}
              onChange={(event) =>
                updateField("topicToLearn", event.target.value)
              }
              error={errors.topicToLearn}
            />
            {!hideStepActions ? (
              <FormActions onBack={goBack} onNext={() => goForward("learn")} />
            ) : null}
          </FormShell>
        );

      case "whyJoin":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label={
                <>
                  why this?
                  <span className="mt-2 block text-lg md:text-xl">
                    why does this group sound interesting to you?
                  </span>
                </>
              }
              name="whyJoin"
              value={data.whyJoin}
              onChange={(event) => updateField("whyJoin", event.target.value)}
              error={errors.whyJoin}
            />
            {firstName ? (
              <p className="text-xs text-muted">
                interesting, {firstName.toLowerCase()}.
              </p>
            ) : null}
            {!hideStepActions ? (
              <FormActions onBack={goBack} onNext={() => goForward("whyJoin")} />
            ) : null}
          </FormShell>
        );

      case "contribution":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label="what do you think you'd bring to the table?"
              helper={
                <span>maybe {contributionHints.join(" maybe ")}</span>
              }
              name="contribution"
              value={data.contribution}
              onChange={(event) =>
                updateField("contribution", event.target.value)
              }
              error={errors.contribution}
            />
            {!hideStepActions ? (
              <FormActions
                onBack={goBack}
                onNext={() => goForward("contribution")}
              />
            ) : null}
          </FormShell>
        );

      case "commitment":
        return (
          <FormShell direction={direction}>
            <FormQuestion eyebrow="one practical question">
              can you realistically make time for a few hours every weekend?
            </FormQuestion>
            <div>
              {(
                Object.entries(COMMITMENT_LABELS) as [
                  WeekendCommitment,
                  string,
                ][]
              ).map(([value, label]) => (
                <ChoiceOption
                  key={value}
                  selected={data.weekendCommitment === value}
                  onSelect={() => updateField("weekendCommitment", value)}
                  title={label}
                />
              ))}
            </div>
            {errors.weekendCommitment ? (
              <p className="text-sm text-accent">
                {errors.weekendCommitment}
              </p>
            ) : null}
            {!hideStepActions ? (
              <FormActions
                onBack={goBack}
                onNext={() => goForward("commitment")}
              />
            ) : null}
          </FormShell>
        );

      case "links":
        return (
          <FormShell direction={direction}>
            <LargeTextarea
              label="anything you want to show us?"
              helper="optional links: github, portfolio, project, research, linkedin post. one per line is fine."
              name="portfolioOrProjectLinks"
              value={data.portfolioOrProjectLinks}
              onChange={(event) =>
                updateField("portfolioOrProjectLinks", event.target.value)
              }
            />
            {!hideStepActions ? (
              <FormActions
                onBack={goBack}
                onNext={() => goForward("links")}
                nextLabel={
                  data.portfolioOrProjectLinks.trim() ? "continue" : "skip for now"
                }
              />
            ) : null}
          </FormShell>
        );

      case "agreement":
        return (
          <FormShell direction={direction}>
            <FormQuestion>
              this is a small, participation-driven group.
            </FormQuestion>
            <p className="text-sm leading-relaxed text-muted">
              i understand that members are expected to show up, learn,
              contribute and actively participate.
            </p>
            <button
              type="button"
              onClick={() => updateField("agreement", !data.agreement)}
              className={cn(
                "focus-ring flex w-full items-start gap-3 border-b py-3 text-left text-sm transition",
                data.agreement
                  ? "border-accent text-foreground"
                  : "border-border/40 text-muted hover:text-foreground",
              )}
              aria-pressed={data.agreement}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1 flex h-4 w-4 shrink-0 items-center justify-center border",
                  data.agreement
                    ? "border-accent bg-accent text-background"
                    : "border-border/60",
                )}
              >
                {data.agreement ? "✓" : ""}
              </span>
              <span>yes, i understand and i&apos;m up for that.</span>
            </button>
            {errors.agreement ? (
              <p className="text-sm text-accent">{errors.agreement}</p>
            ) : null}
            {!hideStepActions ? (
              <FormActions
                onBack={goBack}
                onNext={() => goForward("agreement")}
                nextLabel="review"
              />
            ) : null}
          </FormShell>
        );

      case "review":
        return (
          <FormShell direction={direction}>
            <FormQuestion eyebrow="review">
              {firstName
                ? `${firstName.toLowerCase()}'s note for the table`
                : "your note for the table"}
            </FormQuestion>
            <p className="text-xs text-muted">we&apos;re almost done.</p>

            <div className="space-y-5">
              {[
                ["name", data.fullName, "name"],
                ["stage", STAGE_LABELS[data.currentStage] || "", "stage"],
                ["AI journey", data.aiJourney, "aiJourney"],
                [
                  "interests",
                  data.currentlyLearningOrBuilding,
                  "building",
                ],
                ["talk topic", data.presentationTopic, "presentation"],
                ["wants to learn", data.topicToLearn, "learn"],
                ["why join", data.whyJoin, "whyJoin"],
                ["contribution", data.contribution, "contribution"],
                [
                  "commitment",
                  COMMITMENT_LABELS[data.weekendCommitment] || "",
                  "commitment",
                ],
              ].map(([label, value, step]) => (
                <div
                  key={label}
                  className="grid gap-2 border-b border-border/30 pb-4 last:border-b-0 md:grid-cols-[120px_1fr_auto]"
                >
                  <p className="story-whisper">{label}</p>
                  <p className="whitespace-pre-wrap text-sm">{value}</p>
                  <button
                    type="button"
                    onClick={() => jumpToStep(step as FormStepId)}
                    className="focus-ring text-left text-sm text-accent md:text-right"
                  >
                    edit
                  </button>
                </div>
              ))}
            </div>

            {submitError ? (
              <p className="text-sm text-accent">{submitError}</p>
            ) : null}

            <div className="space-y-3">
              <p className="form-question">ready to take a seat?</p>
              <FormActions
                onBack={goBack}
                onNext={handleSubmit}
                nextLabel={
                  submitting ? "submitting..." : "submit my application"
                }
                nextDisabled={submitting}
              />
            </div>
          </FormShell>
        );

      case "confirmation":
        return (
          <FormShell direction={direction}>
            <FormProgress currentStep="confirmation" />
            <FormQuestion>
              that&apos;s it{firstName ? `, ${firstName.toLowerCase()}` : ""}.
            </FormQuestion>
            <p className="text-sm text-muted">your application is in.</p>
            <div className="space-y-3 text-sm leading-relaxed text-muted">
              <p>
                i&apos;ll personally go through the applications and try to put
                together the right mix of people for the first table.
              </p>
              <p>
                this isn&apos;t about finding the ten best resumes. it&apos;s
                about finding ten people who might make the room more
                interesting.
              </p>
            </div>
            {applicationId ? (
              <p className="font-mono text-[10px] text-muted">
                reference: {applicationId}
              </p>
            ) : null}
          </FormShell>
        );

      default:
        return null;
    }
  };

  return (
    <section
      id="apply"
      className={cn(
        embedded
          ? "relative w-full max-w-md bg-transparent"
          : "relative min-h-screen border-t border-border/30 bg-background px-5 py-14 md:px-8 md:py-16",
      )}
    >
      <div
        className={cn(
          "relative z-10",
          embedded ? "w-full" : "mx-auto w-full max-w-md flex-1",
        )}
      >
        <header className="mb-6 flex items-center justify-between gap-4">
          {displayStep !== "confirmation" && displayStep !== "intro" ? (
            <FormProgress currentStep={displayStep} />
          ) : (
            <span aria-hidden className="h-1" />
          )}
          {showDraftMessage ? (
            <p className="text-xs text-muted">saved on this device</p>
          ) : null}
        </header>

        {renderStep()}
      </div>
    </section>
  );
}
