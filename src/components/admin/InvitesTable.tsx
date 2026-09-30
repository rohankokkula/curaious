export type InviteListItem = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  acceptedAt: string | null;
  createdAt: string;
};

function formatDate(value: string | null) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function InvitesTable({ invites }: { invites: InviteListItem[] }) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
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
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  invite.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {invite.role}
                </span>
              </td>
              <td className="px-4 py-4 text-sm">
                {invite.acceptedAt ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                    {formatDate(invite.acceptedAt)}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-yellow-600">
                    <span className="w-2 h-2 rounded-full bg-yellow-600"></span>
                    Pending
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
