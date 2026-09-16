import type { ApplicationFormData, FormStepId } from "./types";
import { EMPTY_APPLICATION } from "./types";

const STORAGE_KEY = "10p-application-draft-v1";

export interface ApplicationDraft {
  data: ApplicationFormData;
  currentStep: FormStepId;
  updatedAt: string;
}

export function loadDraft(): ApplicationDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplicationDraft;
    return {
      ...parsed,
      data: { ...EMPTY_APPLICATION, ...parsed.data },
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: ApplicationDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
