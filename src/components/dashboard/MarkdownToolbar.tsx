"use client";

import { Bold, Code, Heading2, Italic, Link2, List, ListOrdered, Quote, Table2 } from "lucide-react";
import type { RefObject } from "react";

export type MarkdownAction =
  | "heading"
  | "bold"
  | "italic"
  | "bulleted"
  | "numbered"
  | "quote"
  | "code"
  | "link"
  | "table";

/**
 * Inserts markdown syntax at the textarea's cursor — wraps the current
 * selection if there is one (select a word, hit Bold, get **word**),
 * otherwise inserts a placeholder and selects it so typing replaces it
 * immediately. Manipulates the DOM node directly (selectionStart/End) rather
 * than tracking cursor position in React state, since that position changes
 * on every keystroke and click — state would just be re-deriving what the
 * browser already knows.
 */
function insertAround(textarea: HTMLTextAreaElement, before: string, after: string, placeholder: string): string {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const inner = selected || placeholder;
  const next = value.slice(0, selectionStart) + before + inner + after + value.slice(selectionEnd);

  requestAnimationFrame(() => {
    textarea.focus();
    const from = selectionStart + before.length;
    textarea.setSelectionRange(from, from + inner.length);
  });

  return next;
}

/** Multi-line variant: prefixes every selected line (or the current line,
 * with nothing selected) — for list items and blockquotes, where the syntax
 * belongs at the start of each line, not wrapped around the whole block. */
function prefixLines(textarea: HTMLTextAreaElement, prefix: string, numbered: boolean): string {
  const { selectionStart, selectionEnd, value } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.length ? block.split("\n") : [""];
  const prefixed = lines.map((line, i) => `${numbered ? `${i + 1}. ` : prefix}${line}`).join("\n");

  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + prefixed.length);
  });

  return next;
}

const TABLE_SNIPPET = `| Column A | Column B |\n| --- | --- |\n| Row 1 | Row 1 |\n| Row 2 | Row 2 |`;

/** Applies one toolbar action to a textarea and returns the new value — the
 * caller owns *when* to read the ref (inside its own click handler), this
 * just owns the text-manipulation rules for each action. */
export function applyMarkdownAction(textarea: HTMLTextAreaElement, action: MarkdownAction): string {
  switch (action) {
    case "heading":
      return prefixLines(textarea, "## ", false);
    case "bold":
      return insertAround(textarea, "**", "**", "bold text");
    case "italic":
      return insertAround(textarea, "_", "_", "italic text");
    case "bulleted":
      return prefixLines(textarea, "- ", false);
    case "numbered":
      return prefixLines(textarea, "", true);
    case "quote":
      return prefixLines(textarea, "> ", false);
    case "code":
      return insertAround(textarea, "`", "`", "code");
    case "link":
      return insertAround(textarea, "[", "](https://)", "link text");
    case "table": {
      const needsNewline = textarea.selectionStart > 0 && textarea.value[textarea.selectionStart - 1] !== "\n";
      return insertAround(textarea, needsNewline ? "\n" + TABLE_SNIPPET : TABLE_SNIPPET, "", "");
    }
  }
}

const BUTTONS: { action: MarkdownAction; label: string; icon: typeof Bold }[] = [
  { action: "heading", label: "Heading", icon: Heading2 },
  { action: "bold", label: "Bold", icon: Bold },
  { action: "italic", label: "Italic", icon: Italic },
  { action: "bulleted", label: "Bulleted list", icon: List },
  { action: "numbered", label: "Numbered list", icon: ListOrdered },
  { action: "quote", label: "Quote", icon: Quote },
  { action: "code", label: "Code", icon: Code },
  { action: "link", label: "Link", icon: Link2 },
  { action: "table", label: "Table", icon: Table2 },
];

export function MarkdownToolbar({
  textareaRef,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Markdown formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-border bg-surface p-1.5"
    >
      {BUTTONS.map(({ action, label, icon: Icon }) => (
        <button
          key={action}
          type="button"
          aria-label={label}
          title={label}
          onClick={(event) => {
            const el = textareaRef.current;
            if (!el) return;
            onChange(applyMarkdownAction(el, action));
            event.currentTarget.blur();
          }}
          className="focus-ring flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-card hover:text-foreground"
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
