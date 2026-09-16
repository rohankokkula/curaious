"use client";

import type { FormStepId } from "@/lib/types";
import { PROGRESS_STEPS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FormProgressProps {
  currentStep: FormStepId;
  className?: string;
}

export function FormProgress({ currentStep, className }: FormProgressProps) {
  const progressIndex = PROGRESS_STEPS.indexOf(currentStep);
  const filledSeats =
    currentStep === "confirmation"
      ? 10
      : progressIndex >= 0
        ? Math.min(
            10,
            Math.max(1, Math.ceil((progressIndex / PROGRESS_STEPS.length) * 10)),
          )
        : 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 w-1 rounded-full transition-colors",
              index < filledSeats ? "bg-foreground" : "bg-border/80",
            )}
          />
        ))}
      </div>
      <p className="sr-only">{filledSeats} of 10 steps complete</p>
    </div>
  );
}
