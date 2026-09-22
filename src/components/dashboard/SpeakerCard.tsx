import Link from "next/link";
import { Avatar } from "@/components/dashboard/Avatar";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons/SocialIcons";

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

export function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const links = [
    { href: speaker.linkedin_url, icon: LinkedinIcon, label: "LinkedIn" },
    { href: speaker.twitter_url, icon: XIcon, label: "X" },
    { href: speaker.github_url, icon: GithubIcon, label: "GitHub" },
  ].filter((l): l is { href: string; icon: typeof LinkedinIcon; label: string } => Boolean(l.href));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-bold">Speaker</h2>
      <Link href={`/dashboard/members/${speaker.id}`} className="mt-3 flex items-center gap-3">
        <Avatar name={speaker.name} src={speaker.avatar_url} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{speaker.name}</p>
          {speaker.headline ? <p className="truncate text-xs text-muted">{speaker.headline}</p> : null}
        </div>
      </Link>
      {speaker.bio ? <p className="mt-3 text-sm leading-relaxed text-muted">{speaker.bio}</p> : null}
      {links.length > 0 ? (
        <div className="mt-3 flex gap-2">
          {links.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="flex size-8 items-center justify-center rounded-full bg-surface text-muted transition hover:bg-primary-soft hover:text-primary"
            >
              <Icon className="size-4" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
