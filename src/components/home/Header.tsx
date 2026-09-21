"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 md:px-8 md:py-5">
        <Link href="/" className="focus-ring flex items-center gap-3">
          <CuraiousLogo className="h-[18px] opacity-90" />
          <span className="sr-only">curaious home</span>
        </Link>

        <Link
          href="/apply"
          className="focus-ring border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground transition hover:border-accent hover:text-accent"
        >
          apply
        </Link>
      </div>
    </header>
  );
}
