"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ProfileTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

const ICONS: Record<string, React.ReactNode> = {
  presentation: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  feedback: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" />
    </svg>
  ),
};

export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="space-y-6">
      <div className="flex gap-6 border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm transition-colors duration-150",
                isActive
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {ICONS[tab.id] ?? null}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div key={current?.id} className="animate-fade-in">
        {current?.content}
      </div>
    </div>
  );
}
