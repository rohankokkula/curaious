import { AddInviteForm } from "@/components/admin/AddInviteForm";
import {
  InvitesTable,
  type InviteListItem,
} from "@/components/admin/InvitesTable";
import { getActiveCohort } from "@/lib/cohort";
import { fetchInternal } from "@/lib/internalFetch";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  if (!isSupabaseConfigured) {
    return (
      <p className="prose-quiet">
        the app isn&rsquo;t connected to its database yet.
      </p>
    );
  }

  // `invites` is default-deny under RLS on purpose, so the list comes from the
  // admin route (service-role, admin re-verified there).
  const body = await fetchInternal<{
    ok?: boolean;
    invites?: InviteListItem[];
  }>("/api/admin/invites");

  const cohort = await getActiveCohort();
  const invites = body?.ok ? (body.invites ?? []) : [];

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">{cohort?.name}</p>
        <h1 className="text-4xl font-bold text-foreground mb-2">Invite Members</h1>
        <p className="text-lg text-muted max-w-2xl">
          Only these emails can sign in. You must manually add them here; we
          won&rsquo;t email them automatically.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Add Member</h2>
              <AddInviteForm />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Members ({invites.length})</h2>
              <span className="text-sm text-muted">Manage {cohort?.name}</span>
            </div>

            {!body?.ok ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded text-red-700 text-center">
                Couldn&rsquo;t load the member list.
              </div>
            ) : invites.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted mb-2">No members added yet</p>
                <p className="text-sm text-muted/70">Start by adding members on the left</p>
              </div>
            ) : (
              <InvitesTable invites={invites} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
