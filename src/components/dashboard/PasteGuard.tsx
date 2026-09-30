"use client";

import { toast } from "sonner";

/**
 * Blocks pasting into an authored field. The point of an article here is a
 * member's own thinking, not a faster way to republish something that
 * already exists — pasting in a paragraph is exactly the copy-and-repost
 * path that produces the kind of AI-slop this is meant to avoid.
 *
 * Keyboard paste (Ctrl/Cmd+V), the right-click "Paste" menu item, and the
 * touch "Paste" bubble all fire the same clipboard `paste` event, so one
 * handler on that event catches all three. Dropping dragged-in text is
 * blocked the same way. A caught attempt shows a toast rather than silently
 * doing nothing, so it doesn't read as a broken field.
 *
 * This is a deterrent, not a content filter: it stops the casual "paste it
 * in" action, but it can't detect someone retyping text verbatim from
 * elsewhere — that's a real, acknowledged limit, not a gap in the code.
 */
export function usePasteGuard() {
  function onPaste(event: React.ClipboardEvent) {
    event.preventDefault();
    toast.info("Write it yourself. paste is off here.");
  }

  function onDrop(event: React.DragEvent) {
    if (event.dataTransfer.types.includes("text/plain")) {
      event.preventDefault();
      toast.info("Write it yourself. paste is off here.");
    }
  }

  return { onPaste, onDrop };
}
