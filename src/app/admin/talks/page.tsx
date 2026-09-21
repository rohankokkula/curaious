import {
  PendingTalksTable,
  type PendingTalk,
} from "@/components/admin/PendingTalksTable";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TalkRow = {
  id: string;
  slot_id: string;
  presenter_id: string;
  title: string;
  description: string;
  deck_path: string | null;
  submitted_at: string;
};

export default async function AdminTalksPage() {
  if (!isSupabaseConfigured) {
    return (
      <p className="prose-quiet">
        season 1 isn&rsquo;t connected to its database yet.
      </p>
    );
  }

  const supabase = await createSupabaseServerClient();

  // `is_admin()` in the talks select policy is what makes pending submissions
  // from other people visible here.
  const { data: talkRows } = await supabase
    .from("talks")
    .select("id, slot_id, presenter_id, title, description, deck_path, submitted_at")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true })
    .returns<TalkRow[]>();

  const talks = talkRows ?? [];

  const presenters = new Map<string, string>();
  const slots = new Map<string, { label: string; slot_date: string }>();

  if (talks.length > 0) {
    const [{ data: profileRows }, { data: slotRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name")
        .in("id", [...new Set(talks.map((talk) => talk.presenter_id))])
        .returns<{ id: string; name: string }[]>(),
      supabase
        .from("session_slots")
        .select("id, label, slot_date")
        .in("id", [...new Set(talks.map((talk) => talk.slot_id))])
        .returns<{ id: string; label: string; slot_date: string }[]>(),
    ]);

    for (const profile of profileRows ?? []) {
      presenters.set(profile.id, profile.name);
    }
    for (const slot of slotRows ?? []) {
      slots.set(slot.id, { label: slot.label, slot_date: slot.slot_date });
    }
  }

  const pending: PendingTalk[] = talks.map((talk) => {
    const slot = slots.get(talk.slot_id);

    return {
      id: talk.id,
      title: talk.title,
      description: talk.description,
      presenterId: talk.presenter_id,
      presenterName: presenters.get(talk.presenter_id) ?? "unknown member",
      slotLabel: slot?.label ?? "slot",
      slotDate: slot?.slot_date ?? "",
      submittedAt: talk.submitted_at,
      hasDeck: Boolean(talk.deck_path),
    };
  });

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="story-whisper">review queue</p>
        <h1 className="heading-display text-3xl leading-tight md:text-4xl">
          talks awaiting review
        </h1>
        <p className="prose-quiet max-w-2xl">
          nobody else sees who claimed a slot until you approve it. approving
          puts their name and title on the calendar; sending it back frees the
          slot.
        </p>
      </header>

      <PendingTalksTable talks={pending} />
    </div>
  );
}
