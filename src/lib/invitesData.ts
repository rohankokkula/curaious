/**
 * SERVER-ONLY. Imports the service-role client — Route Handlers and Server
 * Components only. Kept out of invites.ts on purpose: that file is plain
 * schemas, deliberately safe to import from a Client Component (AddInviteForm
 * does), and pulling the service-role client in there would break that.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type InviteListItem = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  acceptedAt: string | null;
  createdAt: string;
};

type InviteRow = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  accepted_at: string | null;
  created_at: string;
};

/** `invites` is default-deny under RLS on purpose (see 0001_init.sql), so this
 * is the only way to list them — same computation GET /api/admin/invites
 * wraps, callable directly from a Server Component. Admin-gating is the
 * caller's job: the route re-verifies via requireAdmin() for any client-side
 * caller (AddInviteForm posts to it); the Server Components that call this
 * directly (admin/page.tsx, admin/invites/page.tsx) are themselves only
 * reachable by an admin, per middleware + the admin layout. */
export async function loadInvites(): Promise<InviteListItem[]> {
  const admin = createSupabaseAdminClient();

  const [{ data, error }, { data: memberships }] = await Promise.all([
    admin
      .from("invites")
      .select("id, name, email, role, accepted_at, created_at")
      .order("created_at", { ascending: true })
      .returns<InviteRow[]>(),
    admin
      .from("cohort_members")
      .select("status, profiles!inner(email)")
      .returns<{ status: "active" | "removed"; profiles: { email: string } }[]>(),
  ]);

  if (error) {
    console.error("loadInvites: query failed", error.message);
    return [];
  }

  // People the curator removed (and who aren't active in any cohort) don't
  // show up as invites either.
  const active = new Set<string>();
  const removed = new Set<string>();
  for (const m of memberships ?? []) {
    (m.status === "active" ? active : removed).add(m.profiles.email.toLowerCase());
  }
  const hidden = (email: string) => removed.has(email.toLowerCase()) && !active.has(email.toLowerCase());

  return (data ?? []).filter((invite) => !hidden(invite.email)).map((invite) => ({
    id: invite.id,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    acceptedAt: invite.accepted_at,
    createdAt: invite.created_at,
  }));
}
