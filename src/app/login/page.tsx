import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INVITE_FORM_URL } from "@/lib/content";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-20 sm:px-6">
      {/* Ambient backdrop: a fine dot grid plus two soft, theme-safe glows — all
          derived from existing tokens so it never fights light/dark mode. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: "radial-gradient(color-mix(in srgb, var(--foreground) 18%, transparent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 40%, transparent 90%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute top-[-12rem] left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/[0.12] blur-[110px]" />
      <div aria-hidden className="pointer-events-none absolute right-[-8rem] bottom-[-10rem] size-[28rem] rounded-full bg-primary/[0.08] blur-[100px]" />

      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">curaious</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Member login</h1>
          <p className="mt-2 text-sm text-muted">Curaious is invite-only.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/[0.03] backdrop-blur-sm dark:shadow-black/20">
          <GoogleSignInButton
            className="focus-ring flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:border-foreground/20 hover:bg-surface hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            iconClassName="size-5"
          />

          <div className="mt-4 flex gap-2.5 rounded-lg bg-surface p-3.5">
            <ShieldCheck className="size-4 shrink-0 text-muted" />
            <p className="text-xs leading-relaxed text-muted">
              You&rsquo;ll be asked to sign in with your Google account. We&rsquo;ll verify that you&rsquo;re on the invite list.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>

        <p className="mt-8 text-center text-xs text-muted">
          Not invited yet?{" "}
          <a href={INVITE_FORM_URL} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
            Get an invite
          </a>
        </p>
      </div>
    </main>
  );
}
