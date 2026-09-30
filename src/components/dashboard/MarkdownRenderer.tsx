import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper so the editor's live preview, the author's own pending-article
 * preview, and the public /articles/[slug] page all render markdown exactly
 * the same way — one place decides what "the article" looks like.
 */
export function MarkdownRenderer({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
