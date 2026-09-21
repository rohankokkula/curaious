import Link from "next/link";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewerProfile();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="mx-auto w-full max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/admin" className="focus-ring">
              <span className="text-sm font-semibold uppercase tracking-widest text-muted">curaious admin</span>
            </Link>
            {viewer ? (
              <form action="/api/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="text-xs font-medium text-muted hover:text-foreground transition"
                >
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
          <AdminNavigation />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-12">{children}</main>
    </div>
  );
}
