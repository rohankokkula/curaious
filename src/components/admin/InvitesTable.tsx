import type { InviteListItem } from "@/lib/invitesData";

function formatDate(value: string | null) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
      }`}
    >
      {role}
    </span>
  );
}

function Status({ acceptedAt }: { acceptedAt: string | null }) {
  return acceptedAt ? (
    <span className="flex items-center gap-2 text-green-600">
      <span className="size-2 rounded-full bg-green-600" />
      {formatDate(acceptedAt)}
    </span>
  ) : (
    <span className="flex items-center gap-2 text-yellow-600">
      <span className="size-2 rounded-full bg-yellow-600" />
      Pending
    </span>
  );
}

export function InvitesTable({ invites }: { invites: InviteListItem[] }) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <>
      {/* phone: one row per invite; a four-column table this narrow pushed the whole page sideways */}
      <ul className="divide-y divide-border/40 md:hidden">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{invite.name}</p>
              <p className="truncate font-mono text-xs text-muted">{invite.email}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs">
              <RoleBadge role={invite.role} />
              <Status acceptedAt={invite.acceptedAt} />
            </div>
          </li>
        ))}
      </ul>

    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Name</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Email</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Role</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Status</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id} className="border-b border-border/40 hover:bg-surface/50 transition">
              <td className="px-4 py-4 font-medium text-foreground">{invite.name}</td>
              <td className="px-4 py-4 text-sm text-muted font-mono">{invite.email}</td>
              <td className="px-4 py-4">
                <RoleBadge role={invite.role} />
              </td>
              <td className="px-4 py-4 text-sm">
                <Status acceptedAt={invite.acceptedAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
