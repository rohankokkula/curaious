/**
 * Shown by the dashboard/admin `loading.tsx` the instant a link is tapped,
 * while the server renders the real page. It's prefetched along with every
 * visible link, so navigation feels immediate even when the data isn't.
 * Deliberately generic (a title, a subtitle, a few cards) so it reads as
 * "this page, loading" for any route under the shell.
 */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-surface" />
        <div className="h-4 w-64 max-w-full rounded bg-surface" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 shrink-0 rounded-full bg-surface" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-surface" />
                <div className="h-3 w-1/2 rounded bg-surface" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
