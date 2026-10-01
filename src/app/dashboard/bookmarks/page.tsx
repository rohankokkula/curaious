import { ResourceGrid, type ResourceMetrics } from "@/components/dashboard/ResourceGrid";
import type { ResourceListItem } from "@/components/dashboard/ResourceCard";
import { getActiveCohort } from "@/lib/cohort";
import type { ResourceCategory } from "@/lib/resources";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/og/metadata";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("bookmarks", { title: "Bookmarks" });

type ResourceRow = {
  id: string;
  kind: "link" | "article";
  category: ResourceCategory;
  title: string;
  url: string;
  slug: string | null;
  note: string | null;
  thumbnail_url: string | null;
  favicon_url: string | null;
  tags: string[];
  read_minutes: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  added_by: string;
};

/** Moved here from the old "Knowledge Sharing" tab under Resources — enough
 * of its own thing (links, articles, likes, saves) to earn its own place in
 * the sidebar rather than live a click deeper. */
async function loadResources(): Promise<{ resources: ResourceListItem[]; metrics: ResourceMetrics }> {
  const cohort = await getActiveCohort();
  if (!cohort) return { resources: [], metrics: { total: 0, contributors: 0, saves: 0 } };

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  const { data: viewer } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: "member" | "admin" }>()
    : { data: null };
  const isAdmin = viewer?.role === "admin";

  // RLS already restricts pending/rejected rows to their own author or an
  // admin, so this select is exactly "everything this viewer is allowed to see".
  const { data: rows } = await supabase
    .from("resource_links")
    .select(
      "id, kind, category, title, url, slug, note, thumbnail_url, favicon_url, tags, read_minutes, status, created_at, added_by",
    )
    .eq("cohort_id", cohort.id)
    .order("created_at", { ascending: false })
    .returns<ResourceRow[]>();

  const resourceRows = rows ?? [];
  const ids = resourceRows.map((r) => r.id);
  const authorIds = [...new Set(resourceRows.map((r) => r.added_by))];

  const [{ data: authors }, { data: likeRows }, { data: saveRows }] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id, name, avatar_url").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("resource_likes").select("resource_id, user_id").in("resource_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("resource_saves").select("resource_id, user_id").in("resource_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));
  const likeCounts = new Map<string, number>();
  const myLikes = new Set<string>();
  for (const row of likeRows ?? []) {
    likeCounts.set(row.resource_id, (likeCounts.get(row.resource_id) ?? 0) + 1);
    if (row.user_id === user?.id) myLikes.add(row.resource_id);
  }
  const saveCounts = new Map<string, number>();
  const mySaves = new Set<string>();
  for (const row of saveRows ?? []) {
    saveCounts.set(row.resource_id, (saveCounts.get(row.resource_id) ?? 0) + 1);
    if (row.user_id === user?.id) mySaves.add(row.resource_id);
  }

  const resources: ResourceListItem[] = resourceRows.map((row) => {
    const author = authorMap.get(row.added_by);
    const isMine = row.added_by === user?.id;
    return {
      id: row.id,
      kind: row.kind,
      category: row.category,
      title: row.title,
      url: row.url,
      slug: row.slug,
      note: row.note,
      thumbnailUrl: row.thumbnail_url,
      faviconUrl: row.favicon_url,
      tags: row.tags,
      readMinutes: row.read_minutes,
      createdAt: row.created_at,
      status: row.status,
      addedBy: { id: row.added_by, name: author?.name ?? "Someone", avatarUrl: author?.avatar_url ?? null },
      likeCount: likeCounts.get(row.id) ?? 0,
      liked: myLikes.has(row.id),
      saveCount: saveCounts.get(row.id) ?? 0,
      saved: mySaves.has(row.id),
      canDelete: isMine || isAdmin,
      canEdit: (isMine && (row.kind === "link" || row.status !== "approved")) || isAdmin,
    };
  });

  const totalSaves = [...saveCounts.values()].reduce((sum, n) => sum + n, 0);

  return {
    resources,
    metrics: {
      total: resources.filter((r) => r.status === "approved").length,
      contributors: new Set(resources.map((r) => r.addedBy.id)).size,
      saves: totalSaves,
    },
  };
}

export default async function BookmarksPage() {
  const { resources, metrics } = await loadResources();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
        <p className="mt-1 text-muted">
          Papers, articles, tools and videos the cohort has shared with each other.
        </p>
      </header>

      <ResourceGrid resources={resources} metrics={metrics} />
    </div>
  );
}
