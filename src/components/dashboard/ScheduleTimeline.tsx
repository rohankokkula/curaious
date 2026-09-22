import Link from "next/link";
import type { SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";

function dateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return {
    weekday: parsed
      .toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })
      .toUpperCase(),
    day: parsed.getUTCDate(),
    month: parsed
      .toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })
      .toUpperCase(),
  };
}

function CheckBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {children}
    </span>
  );
}

function SlotAction({
  slot,
  viewerHasActiveTalk,
}: {
  slot: SlotView;
  viewerHasActiveTalk: boolean;
}) {
  if (slot.type !== "talk") {
    return <CheckBadge>Everyone attends</CheckBadge>;
  }

  if (slot.status === "approved") {
    return slot.talkId ? (
      <Link
        href={`/dashboard/talks/${slot.talkId}/present`}
        className="block rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        View details
      </Link>
    ) : (
      <span className="block rounded-md bg-surface px-3 py-2 text-center text-xs font-medium text-muted">
        Claimed
      </span>
    );
  }

  if (slot.status === "pending") {
    return (
      <span className="block rounded-md bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
        {slot.isMine ? "Your slot · pending" : "Pending review"}
      </span>
    );
  }

  if (viewerHasActiveTalk) {
    return (
      <span className="block rounded-md bg-surface px-3 py-2 text-center text-xs font-medium text-muted">
        Open
      </span>
    );
  }

  return (
    <Link
      href={`/dashboard/slots/${slot.id}/submit`}
      className="block rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
    >
      Claim slot
    </Link>
  );
}

export function ScheduleTimeline({
  slots,
  viewerHasActiveTalk,
}: {
  slots: SlotView[];
  viewerHasActiveTalk: boolean;
}) {
  return (
    <section
      id="schedule"
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 className="text-lg font-bold text-foreground">Season schedule</h2>
      <p className="mt-1 text-sm text-muted">
        All key dates for Curaious. Claim one talk slot for the season.
      </p>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {slots.map((slot) => {
          const { weekday, day, month } = dateParts(slot.date);
          const isSession = slot.type !== "talk";

          return (
            <div
              key={slot.id}
              className={cn(
                "flex min-w-[148px] flex-1 flex-col rounded-lg border p-4",
                isSession
                  ? "border-primary/30 bg-primary-soft"
                  : slot.isMine
                    ? "border-primary bg-card"
                    : "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "mx-auto mb-3 h-1.5 w-1.5 rounded-full",
                  slot.status === "open" && !isSession
                    ? "bg-primary-soft0"
                    : "bg-border",
                )}
              />

              <div className="text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {weekday}
                </p>
                <p className="text-2xl font-bold leading-tight text-foreground">
                  {day}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {month}
                </p>
              </div>

              <div className="mt-3 min-h-[52px] text-center">
                <p className="text-sm font-semibold text-foreground">
                  {slot.label}
                </p>
                {slot.status === "approved" && slot.title ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {slot.title}
                  </p>
                ) : slot.status === "approved" ? (
                  <p className="mt-1 text-xs text-muted">Talk confirmed</p>
                ) : isSession ? (
                  <p className="mt-1 text-xs text-muted">Whole cohort</p>
                ) : (
                  <p className="mt-1 text-xs text-muted">1 talk</p>
                )}
              </div>

              <div className="mt-auto pt-3">
                <SlotAction
                  slot={slot}
                  viewerHasActiveTalk={viewerHasActiveTalk}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
