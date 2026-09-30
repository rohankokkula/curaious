import { FileText, MessageCircleQuestion, PenLine, ShieldCheck } from "lucide-react";
import { GuideCard } from "@/components/dashboard/GuideCard";
import { ProfileTabs } from "@/components/dashboard/ProfileTabs";
import { ResourceGrid, type ResourceMetrics } from "@/components/dashboard/ResourceGrid";
import type { ResourceListItem } from "@/components/dashboard/ResourceCard";
import { getActiveCohort } from "@/lib/cohort";
import { RATING_PARAMETERS } from "@/lib/ratings";
import type { ResourceCategory } from "@/lib/resources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

async function loadResources(): Promise<{ resources: ResourceListItem[]; metrics: ResourceMetrics }> {
  const cohort = await getActiveCohort();
  if (!cohort) return { resources: [], metrics: { total: 0, contributors: 0, saves: 0 } };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

export default async function ResourcesPage() {
  const { resources, metrics } = await loadResources();

  const guidesTab = (
    <div className="grid gap-4 sm:grid-cols-2">
      <GuideCard
        icon={<PenLine className="size-4.5" />}
        title="Deck template"
        description="A starting outline for your talk slides: title, agenda, core content, and a closing summary."
        downloadHref="/resources/deck-template.md"
        body={
          <>
            <p>Use this as a starting outline. Aim for 10–15 slides, 16:9, one idea per slide.</p>
            <ol>
              <li><strong>Title</strong>: talk title, your name, date.</li>
              <li><strong>Agenda</strong>: 3–4 bullets on what you&rsquo;ll cover.</li>
              <li><strong>The problem</strong>: what you&rsquo;re solving and why it matters.</li>
              <li><strong>Context / background</strong>: just enough for everyone to follow.</li>
              <li><strong>The core</strong>: your approach, method or build. Prefer screenshots and demos over walls of text.</li>
              <li><strong>What went wrong / what you&rsquo;d do differently</strong>: usually the most useful slide in the room.</li>
              <li><strong>Key takeaways</strong>: 3 bullets max.</li>
              <li><strong>Resources / links</strong>: anything you referenced.</li>
              <li><strong>Thank you / Q&amp;A</strong>: contact info if you&rsquo;re open to follow-ups.</li>
            </ol>
          </>
        }
      />
      <GuideCard
        icon={<FileText className="size-4.5" />}
        title="Submission guidelines"
        description="What a good title and description look like, and how the review process works."
        body={
          <>
            <h4>Title</h4>
            <p>4–140 characters. Say what the talk is about, not just the topic: &ldquo;Building AI Agents for Real-World Use Cases&rdquo; beats &ldquo;AI Agents&rdquo;.</p>
            <h4>Description</h4>
            <p>40–2000 characters. Cover what you&rsquo;ll walk through and what people should take away. This is what an admin reviews before approving your slot.</p>
            <h4>Deck</h4>
            <p>PDF only, up to 25MB, ideally 16:9. No confidential information.</p>
            <h4>Review</h4>
            <p>An admin approves or sends back your submission with a reason. Your name stays off the public schedule until it&rsquo;s approved.</p>
          </>
        }
      />
      <GuideCard
        icon={<ShieldCheck className="size-4.5" />}
        title="Code of conduct"
        description="How we keep sessions respectful and feedback constructive."
        body={
          <>
            <ul>
              <li>Be on time, and give the presenter your attention.</li>
              <li>Critique the work, not the person. Feedback is attributed, and it&rsquo;s read by a real person.</li>
              <li>No recording or sharing a deck outside the cohort without the presenter&rsquo;s OK.</li>
              <li>Disagree openly, but keep it about the ideas.</li>
              <li>If something feels off, tell an admin.</li>
            </ul>
          </>
        }
      />
      <GuideCard
        icon={<MessageCircleQuestion className="size-4.5" />}
        title="Giving good feedback"
        description="A short guide to writing feedback that's specific, kind, and useful."
        body={
          <>
            <p>Your feedback covers five things:</p>
            <ul>
              {RATING_PARAMETERS.map((p) => (
                <li key={p.key}><strong>{p.label}</strong>: {p.hint}</li>
              ))}
            </ul>
            <h4>In the comment box</h4>
            <p>Be specific: name one thing that worked and one thing that would make it better next time. Skip generic praise: &ldquo;great talk&rdquo; helps no one, &ldquo;the demo made the tradeoff click&rdquo; does.</p>
          </>
        }
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="mt-1 text-muted">
          Guides for presenting and giving feedback, and what the cohort has shared with each other.
        </p>
      </header>

      <ProfileTabs
        tabs={[
          { id: "guides", label: "Guides", content: guidesTab },
          {
            id: "knowledge",
            label: "Knowledge Sharing",
            content: <ResourceGrid resources={resources} metrics={metrics} />,
          },
        ]}
      />
    </div>
  );
}
