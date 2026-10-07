import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper so the editor's live preview, the author's own pending-article
 * preview, and the public /hearticles/[slug] page all render markdown exactly
 * the same way — one place decides what "the article" looks like.
 */
export function MarkdownRenderer({ markdown, className }: { markdown: string; className?: string }) {
  return (
    // Single line breaks are kept as written. Plain markdown folds a lone
    // newline into a space, which turned poem-like, line-by-line writing into
    // one long paragraph; the newlines are still in the text, so showing them
    // is just white-space: pre-line (blank lines still start a new paragraph).
    <div className={cn("markdown-body [&_blockquote]:whitespace-pre-line [&_li]:whitespace-pre-line [&_p]:whitespace-pre-line", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
