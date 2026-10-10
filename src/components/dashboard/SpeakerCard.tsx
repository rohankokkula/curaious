import Link from "next/link";
import { AccentGlow } from "@/components/dashboard/AccentCard";
import { Avatar } from "@/components/dashboard/Avatar";
import type { DayPalette } from "@/components/dashboard/seasonLayout";
import {
  GithubIcon,
  LinkedinIcon,
  XIcon,
} from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";

export type Speaker = {
  id: string;
  name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
};

/** With a palette, it takes the talk's day color, like the profile card. */
export function SpeakerCard({
  speaker,
  palette,
}: {
  speaker: Speaker;
  palette?: DayPalette;
}) {
  const links = [
    { href: speaker.linkedin_url, icon: LinkedinIcon, label: "LinkedIn" },
    { href: speaker.twitter_url, icon: XIcon, label: "X" },
    { href: speaker.github_url, icon: GithubIcon, label: "GitHub" },
  ].filter(
    (l): l is { href: string; icon: typeof LinkedinIcon; label: string } =>
      Boolean(l.href),
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border bg-card p-5",
        palette ? "rounded-3xl" : "rounded-xl",
      )}
    >
      {palette ? <AccentGlow palette={palette} size="sm" /> : null}
      <div className="relative">
        <h2
          className={
            palette
              ? cn(
                  "text-[11px] font-semibold tracking-[0.18em] uppercase",
                  palette.label,
                )
              : "text-base font-bold"
          }
        >
          Speaker
        </h2>
        <Link
          href={`/dashboard/members/${speaker.id}`}
          className="group mt-3 flex items-center gap-3"
        >
          <Avatar
            name={speaker.name}
            src={speaker.avatar_url}
            size="md"
            className={cn(palette && cn("size-14 border-2", palette.well))}
          />
          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-semibold group-hover:underline",
                palette ? "text-base" : "text-sm",
              )}
            >
              {speaker.name}
            </p>
            {speaker.headline ? (
              <p className="truncate text-xs text-muted">{speaker.headline}</p>
            ) : null}
          </div>
        </Link>
        {speaker.bio ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {speaker.bio}
          </p>
        ) : null}
        {links.length > 0 ? (
          <div className="mt-3 flex gap-2">
            {links.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-muted transition",
                  palette
                    ? cn("border hover:text-foreground", palette.well)
                    : "bg-surface hover:bg-primary-soft hover:text-primary",
                )}
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
