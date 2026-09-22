import { Download, ExternalLink } from "lucide-react";

/** Read-only deck viewer for the rating page: dark toolbar + native PDF viewer. */
export function DeckPane({ talkId, hasDeck }: { talkId: string; hasDeck: boolean }) {
  const src = `/api/talks/${encodeURIComponent(talkId)}/deck/view`;

  return (
    <div className="flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-neutral-800 lg:h-full lg:min-h-[640px]">
      <div className="flex items-center justify-between px-4 py-3 text-sm text-neutral-200">
        <span className="font-medium">Presentation deck</span>
        {hasDeck ? (
          <div className="flex items-center gap-1">
            <a href={src} download aria-label="Download deck" className="rounded p-1.5 hover:bg-white/10">
              <Download className="size-4" />
            </a>
            <a href={src} target="_blank" rel="noreferrer" aria-label="Open in new tab" className="rounded p-1.5 hover:bg-white/10">
              <ExternalLink className="size-4" />
            </a>
          </div>
        ) : null}
      </div>
      {hasDeck ? (
        <iframe src={src} title="Talk deck" className="w-full flex-1 bg-white" />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-card px-6 text-center text-sm text-muted">
          The presenter hasn&rsquo;t attached a deck to this talk.
        </div>
      )}
    </div>
  );
}
