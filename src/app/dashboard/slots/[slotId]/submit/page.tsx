import Link from "next/link";
import { notFound } from "next/navigation";
import { TalkSubmitForm } from "@/components/dashboard/TalkSubmitForm";
import { formatSlotDate } from "@/lib/talks";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SlotRow = {
  id: string;
  slot_date: string;
  slot_type: string;
  label: string;
  capacity: number;
};

function Notice({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl bg-card border border-border rounded-lg p-8 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
      <p className="text-sm text-muted">{children}</p>
      <Link
        href="/dashboard"
        className="inline-block px-4 py-2 bg-foreground text-primary-foreground text-sm font-medium rounded hover:bg-foreground/90 transition"
      >
        Back to calendar
      </Link>
    </div>
  );
}

export default async function SubmitTalkPage({
  params,
}: {
  params: Promise<{ slotId: string }>;
}) {
  const { slotId } = await params;

  if (!isSupabaseConfigured) {
    return (
      <Notice heading="not set up yet">
        season 1 isn&rsquo;t connected to its database yet.
      </Notice>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Notice heading="sign in first">
        your session expired. sign in again and come back.
      </Notice>
    );
  }

  const { data: slot } = await supabase
    .from("session_slots")
    .select("id, slot_date, slot_type, label, capacity")
    .eq("id", slotId)
    .maybeSingle<SlotRow>();

  if (!slot) notFound();

  if (slot.slot_type !== "talk") {
    return (
      <Notice heading="not a talk slot">
        {slot.label} isn&rsquo;t a slot anyone presents in. It belongs to the
        whole table.
      </Notice>
    );
  }

  // Under RLS this only sees approved talks plus the viewer's own, which is
  // deliberate: another member's pending claim stays anonymous. /api/talks
  // does the authoritative open/taken check and answers 409 if it lost a race.
  const { data: visibleClaims } = await supabase
    .from("talks")
    .select("id, status, presenter_id")
    .eq("slot_id", slot.id)
    .neq("status", "rejected")
    .returns<{ id: string; status: string; presenter_id: string }[]>();

  const claims = visibleClaims ?? [];
  const mine = claims.find((claim) => claim.presenter_id === user.id);

  if (mine) {
    return (
      <Notice heading="this slot is taken">
        this is your slot already. your submission is on your profile.
      </Notice>
    );
  }

  if (claims.length >= slot.capacity) {
    return (
      <Notice heading="this slot is full">
        {slot.capacity > 1
          ? `all ${slot.capacity} spots here are taken. pick another open slot.`
          : "someone else has this one. pick another open slot."}
      </Notice>
    );
  }

  const { data: myActiveTalk } = await supabase
    .from("talks")
    .select("id, status")
    .eq("presenter_id", user.id)
    .neq("status", "rejected")
    .maybeSingle<{ id: string; status: string }>();

  if (myActiveTalk) {
    return (
      <Notice heading="you already have a talk in play">
        one at a time. if it gets sent back you can claim a different slot.
      </Notice>
    );
  }

  return (
    <TalkSubmitForm slotId={slot.id} slotLabel={slot.label} slotDate={formatSlotDate(slot.slot_date)} />
  );
}
