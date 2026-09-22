"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { INVITE_FORM_URL } from "@/lib/content";
import { cn } from "@/lib/utils";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // solid once the hero is mostly behind us
      setScrolled(window.scrollY > window.innerHeight * 0.7);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 md:flex-nowrap md:px-8 md:py-5">
        <Link href="/" className="focus-ring flex items-center gap-3">
          <CuraiousLogo className="text-lg opacity-90" />
          <span className="sr-only">curaious home</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <GoogleSignInButton
            className="focus-ring flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground transition hover:border-accent hover:text-accent disabled:opacity-60 sm:px-4"
            iconClassName="size-3.5"
            idleLabel="log in"
            loadingLabel="signing in…"
          />

          <a
            href={INVITE_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring bg-foreground px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-background transition hover:bg-accent sm:px-4"
          >
            get an invite
          </a>
        </div>
      </div>
    </header>
  );
}
