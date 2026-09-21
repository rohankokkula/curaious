import Link from "next/link";
import { fetchInternal } from "@/lib/internalFetch";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InvitesResponse = {
  ok?: boolean;
  invites?: { acceptedAt: string | null }[];
};

function Stat({
  value,
  label,
  href,
}: {
  value: string | number;
  label: string;
  href?: string;
}) {
  const body = (
    <div className="space-y-2 border border-border/60 p-5">
      <p className="heading-display text-3xl">{value}</p>
      <p className="form-label">{label}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="focus-ring block transition hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function AdminOverviewPage() {
  if (!isSupabaseConfigured) {
    return (
      <p className="prose-quiet">
        season 1 isn&rsquo;t connected to its database yet.
      </p>
    );
  }

  const supabase = await createSupabaseServerClient();

  // Admins see every talk under the `talks` select policy, so these counts can
  // come straight through RLS.
  const [pending, approved, talkSlots, invites] = await Promise.all([
    supabase
      .from("talks")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("talks")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("session_slots")
      .select("id", { count: "exact", head: true })
      .eq("slot_type", "talk"),
    // `invites` is default-deny under RLS, so it comes via the admin route.
    fetchInternal<InvitesResponse>("/api/admin/invites"),
  ]);

  const inviteRows = invites?.ok ? (invites.invites ?? []) : [];
  const unaccepted = inviteRows.filter((invite) => !invite.acceptedAt).length;

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="story-whisper">october 2026</p>
        <h1 className="heading-display text-3xl leading-tight md:text-4xl">
          season 1, from the other side of the table
        </h1>
        <p className="prose-quiet max-w-2xl">
          review submissions before names go public, and keep the invite list
          honest.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          value={pending.count ?? 0}
          label="talks awaiting review"
          href="/admin/talks"
        />
        <Stat
          value={`${approved.count ?? 0} / ${talkSlots.count ?? 0}`}
          label="talk slots filled"
        />
        <Stat
          value={unaccepted}
          label="invites not signed in yet"
          href="/admin/invites"
        />
        <Stat
          value={inviteRows.length}
          label="people invited"
          href="/admin/invites"
        />
      </div>
    </div>
  );
}
