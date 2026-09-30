"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GuideItem = {
  id: string;
  /** A rendered icon element (e.g. `<PenLine className="size-4.5" />`), not a component reference —
   * component references (like lucide-react's forwardRef objects) aren't serializable across the
   * server/client boundary, but a JSX element is. */
  icon: React.ReactNode;
  title: string;
  description: string;
  body: React.ReactNode;
  downloads?: { label: string; href: string }[];
};

/** Same underline-tab look as ProfileTabs (the member profile page), kept
 * as its own component rather than extending that one — this needs a
 * per-tab icon and an optional download row, which ProfileTabs has no
 * reason to carry for its own two tabs. */
export function GuidesTabs({ items }: { items: GuideItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const active = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6 border-b border-border">
        {items.map((item) => {
          const isActive = item.id === active?.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm transition-colors duration-150",
                isActive
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {item.icon}
              {item.title}
            </button>
          );
        })}
      </div>

      {active ? (
        <div key={active.id} className="animate-fade-in space-y-4">
          <p className="text-sm text-muted">{active.description}</p>

          <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-muted [&_h4]:font-semibold [&_h4]:text-foreground [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
            {active.body}
          </div>

          {active.downloads?.length ? (
            <div className="flex flex-wrap gap-2">
              {active.downloads.map((d) => (
                <Button key={d.href} asChild variant="outline" size="sm">
                  <a href={d.href} download>
                    <Download className="size-3.5" /> {d.label}
                  </a>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
