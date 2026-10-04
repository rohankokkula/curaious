import {
  PendingTalksTable,
  type PendingTalk,
} from "@/components/admin/PendingTalksTable";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TalkRow = {
  id: string;
  presenter_id: string;
  title: string;
  description: string;
  status: "pending" | "approved";
  deck_path: string | null;
  deck_status: string;
  submitted_at: string;
  slot: { label: string; slot_date: string } | null;
  presenter: { name: string } | null;
};

function toPending(talk: TalkRow): PendingTalk {
  return {
    id: talk.id,
    title: talk.title,
    description: talk.description,
    presenterId: talk.presenter_id,
    presenterName: talk.presenter?.name ?? "unknown member",
    slotLabel: talk.slot?.label ?? "slot",
    slotDate: talk.slot?.slot_date ?? "",
    submittedAt: talk.submitted_at,
    hasDeck: Boolean(talk.deck_path),
  };
}

/**
 * Two queues. A member first *requests* a slot (title + description); you
 * approve the booking, which puts their name on the schedule. The deck comes
 * later and is reviewed on its own before anyone else can open it.
 */
export default async function AdminTalksPage() {
  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Season 1 isn&rsquo;t connected to its database yet.</p>;
  }

  const supabase = await createSupabaseServerClient();

  // `is_admin()` in the talks select policy is what makes other people's
  // requests visible here.
  const { data } = await supabase
    .from("talks")
    .select(
      "id, presenter_id, title, description, status, deck_path, deck_status, submitted_at, slot:session_slots (label, slot_date), presenter:profiles!presenter_id (name)",
    )
    .or("status.eq.pending,and(status.eq.approved,deck_status.eq.submitted)")
    .order("submitted_at", { ascending: true })
    .returns<TalkRow[]>();

  const rows = data ?? [];
  const requests = rows.filter((t) => t.status === "pending").map(toPending);
  const decks = rows.filter((t) => t.status === "approved").map(toPending);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Talks to review</h1>
        <p className="mt-1 text-muted">
          Approve a slot request to book it. Decks come later and get their own review before the cohort can open them.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          Slot requests
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted tabular-nums">{requests.length}</span>
        </h2>
        <PendingTalksTable talks={requests} kind="booking" />
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          Decks to review
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted tabular-nums">{decks.length}</span>
        </h2>
        <PendingTalksTable talks={decks} kind="deck" />
      </section>
    </div>
  );
}
