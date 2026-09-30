import Link from "next/link";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { INVITE_FORM_URL } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-border/40 px-5 py-10 md:px-8 md:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="focus-ring">
          <CuraiousLogo className="text-lg opacity-80" />
          <span className="sr-only">curaious home</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <a href={INVITE_FORM_URL} target="_blank" rel="noreferrer" className="focus-ring transition hover:text-foreground">
            get an invite
          </a>
          <span>© {new Date().getFullYear()} curaious</span>
        </div>
      </div>
    </footer>
  );
}
