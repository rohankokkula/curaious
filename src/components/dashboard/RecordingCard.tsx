import { ExternalLink, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { parseRecordingUrl } from "@/lib/recording";

/**
 * The session recording for a talk.
 *
 * Only a link that `parseRecordingUrl` recognises is ever embedded — anything
 * else falls back to a plain outbound link. Members supply this URL
 * themselves, so an unrecognised one must not reach an iframe.
 */
export function RecordingCard({
  url,
  title,
  isSample = false,
}: {
  url: string;
  title: string;
  /** Renders the stand-in link used to check the layout before a real
   * recording exists, clearly marked so it isn't mistaken for one. */
  isSample?: boolean;
}) {
  const recording = parseRecordingUrl(url);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2">
          <Video aria-hidden className="size-4 text-muted" />
          <h3 className="text-base font-semibold">Session recording</h3>
        </div>
        <div className="flex items-center gap-2">
          {isSample ? <Badge variant="warning">Sample</Badge> : null}
          {recording ? (
            <a
              href={recording.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
            >
              Open
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        {recording ? (
          <div className="aspect-video overflow-hidden rounded-lg border border-border bg-surface">
            <iframe
              src={recording.embedUrl}
              title={`Recording of ${title}`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="size-full"
            />
          </div>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface p-4 text-sm transition hover:border-foreground/30"
          >
            <ExternalLink aria-hidden className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate">{url}</span>
          </a>
        )}

        {isSample ? (
          <p className="mt-3 text-xs text-muted">
            Placeholder while recordings are being set up. Only admins can see this card.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
