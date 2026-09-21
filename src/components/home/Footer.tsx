import Link from "next/link";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";

export function Footer() {
  return (
    <footer className="border-t border-border/40 px-5 py-10 md:px-8 md:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="focus-ring">
          <CuraiousLogo className="h-[18px] opacity-80" />
          <span className="sr-only">curaious home</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <Link href="/apply" className="focus-ring transition hover:text-foreground">
            apply
          </Link>
          <span>hyderabad, india</span>
          <span>© {new Date().getFullYear()} curaious</span>
        </div>
      </div>
    </footer>
  );
}
