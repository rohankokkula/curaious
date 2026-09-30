import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(field, "h-10", className)} {...props} />;
}

/** `ref` spelled out explicitly in the type rather than relying on
 * `ComponentProps` to carry it — needed so the markdown toolbar can reach
 * into the textarea (cursor position, selection) to insert syntax. React 19
 * delivers `ref` as an ordinary prop now, no `forwardRef` required. */
export function Textarea({
  className,
  ref,
  ...props
}: React.ComponentProps<"textarea"> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn(field, "min-h-24 py-2.5", className)} {...props} />;
}
