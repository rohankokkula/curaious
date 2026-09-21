import type { Metadata } from "next";
import Link from "next/link";
import { ApplyCanvas } from "@/components/application/ApplyCanvas";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { Footer } from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "apply — curaious",
  description:
    "apply for one of ten seats in cohort 01 of curaious, a small ai learning circle in hyderabad.",
};

export default function ApplyPage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 md:px-8 md:py-5">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="h-[18px] opacity-90" />
            <span className="sr-only">curaious home</span>
          </Link>
          <Link
            href="/"
            className="focus-ring font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition hover:text-foreground"
          >
            ← back
          </Link>
        </div>
      </header>

      <main>
        <ApplyCanvas />
      </main>

      <Footer />
    </>
  );
}
