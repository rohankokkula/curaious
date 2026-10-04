"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  not_invited: "That Google account isn't on the invite list. Sign in with the email you were invited with.",
  removed: "You're no longer part of this cohort. Reach out to the curator if that's a mistake.",
  link_expired: "That sign-in link expired. Try again.",
  missing_code: "Sign-in didn't complete. Try again.",
  profile_failed: "We couldn't set up your profile. Try again in a moment.",
  not_configured: "Sign-in isn't switched on yet.",
};

/** Why the auth callback sent someone back here (`/login?error=…`). */
export function LoginError() {
  const code = useSearchParams().get("error");
  const message = code ? (MESSAGES[code] ?? "Sign-in didn't work. Try again.") : null;
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </p>
  );
}
