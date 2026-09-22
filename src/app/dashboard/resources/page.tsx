import { FileText, MessageCircleQuestion, PenLine, ShieldCheck } from "lucide-react";
import { GuideCard } from "@/components/dashboard/GuideCard";
import { KnowledgeSharing, type KnowledgeLink } from "@/components/dashboard/KnowledgeSharing";
import { ProfileTabs } from "@/components/dashboard/ProfileTabs";
import { getActiveCohort } from "@/lib/cohort";
import { RATING_PARAMETERS } from "@/lib/ratings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadLinks(): Promise<KnowledgeLink[]> {
  const cohort = await getActiveCohort();
  if (!cohort) return [];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewer } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: "member" | "admin" }>()
    : { data: null };
  const isAdmin = viewer?.role === "admin";

  const { data: rows } = await supabase
    .from("resource_links")
    .select("id, title, url, note, created_at, added_by")
    .eq("cohort_id", cohort.id)
    .order("created_at", { ascending: false });

  const authorIds = [...new Set((rows ?? []).map((r) => r.added_by))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, name, avatar_url").in("id", authorIds)
    : { data: [] };
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));

  return (rows ?? []).map((r) => {
    const author = authorMap.get(r.added_by);
    return {
      id: r.id,
      title: r.title,
      url: r.url,
      note: r.note,
      createdAt: r.created_at,
      addedBy: { id: r.added_by, name: author?.name ?? "Someone", avatarUrl: author?.avatar_url ?? null },
      canDelete: r.added_by === user?.id || isAdmin,
    };
  });
}

export default async function ResourcesPage() {
  const links = await loadLinks();

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
        <p className="mt-1 text-muted">Guides for presenting and giving feedback, and links the cohort has shared.</p>
      </header>

      <ProfileTabs
        tabs={[
          { id: "guides", label: "Guides", content: guidesTab },
          { id: "knowledge", label: "Knowledge Sharing", content: <KnowledgeSharing links={links} /> },
        ]}
      />
    </div>
  );
}
