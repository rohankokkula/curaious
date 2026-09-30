"use client";

import { Bookmark, ExternalLink, FileText, Newspaper, PlayCircle, Sparkles, SquarePen, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/dashboard/Avatar";
import { LinkPreviewModal } from "@/components/dashboard/LinkPreviewModal";
import { Badge } from "@/components/ui/badge";
import { RESOURCE_CATEGORY_LABELS, hostOf, type ResourceCategory } from "@/lib/resources";
import { cn } from "@/lib/utils";

export type ResourceListItem = {
  id: string;
  kind: "link" | "article";
  category: ResourceCategory;
  title: string;
  url: string;
  slug: string | null;
  note: string | null;
  thumbnailUrl: string | null;
  faviconUrl: string | null;
  tags: string[];
  readMinutes: number | null;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  addedBy: { id: string; name: string; avatarUrl: string | null };
  likeCount: number;
  liked: boolean;
  saveCount: number;
  saved: boolean;
  canDelete: boolean;
  canEdit: boolean;
};

const CATEGORY_ICON: Record<ResourceCategory, typeof FileText> = {
  paper: FileText,
  article: Newspaper,
  tool: Wrench,
  guide: FileText,
  video: PlayCircle,
  demo: Sparkles,
  other: FileText,
};

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.98 20.54a.562.562 0 0 1-.84-.61l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

export function ResourceCard({ resource }: { resource: ResourceListItem }) {
  const router = useRouter();
  const [liked, setLiked] = useState(resource.liked);
  const [likeCount, setLikeCount] = useState(resource.likeCount);
  const [saved, setSaved] = useState(resource.saved);
  const [previewOpen, setPreviewOpen] = useState(false);
  const Icon = CATEGORY_ICON[resource.category];

  async function toggle(kind: "like" | "save") {
    const res = await fetch(`/api/resources/links/${resource.id}/${kind}`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; liked?: boolean; saved?: boolean; count?: number };
    if (!res.ok || !json.ok) return toast.error("couldn't update that.");
    if (kind === "like") {
      setLiked(Boolean(json.liked));
      setLikeCount(json.count ?? 0);
    } else {
      setSaved(Boolean(json.saved));
    }
  }

  async function remove() {
    const res = await fetch(`/api/resources/links/${resource.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("couldn't remove that.");
    toast.success("Removed");
    router.refresh();
  }

  const isArticle = resource.kind === "article";
  // An article that isn't approved yet has no public page — it 404s there
  // even for its own author, since /articles/[slug] only ever serves
  // approved rows. Route it to the editor instead, which is the one place
  // a pending/rejected piece can actually be opened.
  const isUnpublished = isArticle && resource.status !== "approved";
  const href = isUnpublished
    ? `/dashboard/resources/write?edit=${resource.id}`
    : isArticle
      ? `/articles/${resource.slug}`
      : resource.url;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <button
        type="button"
        onClick={() => (isArticle ? router.push(href) : setPreviewOpen(true))}
        className="block text-left"
      >
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-surface">
          {resource.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resource.thumbnailUrl}
              alt=""
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Icon className="size-5 text-muted" />
          )}
          <span className="absolute left-1.5 top-1.5">
            <Badge className="bg-card/90 px-1.5 py-0 text-[10px] backdrop-blur-sm">
              {RESOURCE_CATEGORY_LABELS[resource.category]}
            </Badge>
          </span>
        </div>

        <div className="p-2.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{resource.title}</h3>
          {resource.note ? <p className="mt-1 line-clamp-2 text-xs text-muted">{resource.note}</p> : null}

          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
            {resource.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resource.faviconUrl}
                alt=""
                className="size-3 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <span className="truncate">
              {isArticle
                ? resource.readMinutes
                  ? `${resource.readMinutes} min read`
                  : "Article"
                : hostOf(resource.url)}
            </span>
          </div>
        </div>
      </button>

      <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-border px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <Avatar name={resource.addedBy.name} src={resource.addedBy.avatarUrl} size="sm" />
          <Link
            href={`/dashboard/members/${resource.addedBy.id}`}
            className="truncate text-[11px] hover:text-foreground hover:underline"
          >
            {resource.addedBy.name}
          </Link>
          {resource.status !== "approved" ? (
            <Badge variant={resource.status === "pending" ? "warning" : "danger"} className="px-1.5 py-0 text-[10px]">
              {resource.status === "pending" ? "In review" : "Sent back"}
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {isUnpublished ? (
            <Link
              href={href}
              aria-label="Edit"
              className="rounded-md p-1 text-muted transition hover:bg-surface hover:text-foreground"
            >
              <SquarePen className="size-3" />
            </Link>
          ) : null}
          <button
            type="button"
            aria-label={liked ? "Unlike" : "Like"}
            onClick={() => void toggle("like")}
            className={cn("flex items-center gap-0.5 rounded-md px-1 py-1 text-[11px] transition hover:bg-surface", liked ? "text-amber-500" : "text-muted")}
          >
            <StarIcon filled={liked} className="size-3" />
            {likeCount > 0 ? likeCount : null}
          </button>
          <button
            type="button"
            aria-label={saved ? "Remove bookmark" : "Bookmark"}
            onClick={() => void toggle("save")}
            className={cn("rounded-md p-1 transition hover:bg-surface", saved ? "text-primary" : "text-muted")}
          >
            <Bookmark className="size-3" fill={saved ? "currentColor" : "none"} />
          </button>
          {!isArticle ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in new tab"
              className="rounded-md p-1 text-muted transition hover:bg-surface hover:text-foreground"
            >
              <ExternalLink className="size-3" />
            </a>
          ) : null}
          {resource.canDelete ? (
            <button
              type="button"
              aria-label="Remove"
              onClick={() => void remove()}
              className="rounded-md p-1 text-muted transition hover:bg-surface hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          ) : null}
        </div>
      </div>

      {!isArticle ? (
        <LinkPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          url={resource.url}
          title={resource.title}
        />
      ) : null}
    </div>
  );
}
