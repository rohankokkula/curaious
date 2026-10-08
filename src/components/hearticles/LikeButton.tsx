"use client";

import { Heart } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * The hearticle's like, shared by every LikeButton on the page (the byline
 * one and the one at the end stay in step). Optimistic: flips at once and
 * rolls back if the request fails.
 */
type LikeState = { liked: boolean; count: number };

const stores = new Map<string, { state: LikeState; listeners: Set<() => void> }>();

function storeFor(slug: string, initial: LikeState) {
  // never cache on the server: the map would outlive the request
  if (typeof window === "undefined") return { state: initial, listeners: new Set<() => void>() };
  let store = stores.get(slug);
  if (!store) {
    store = { state: initial, listeners: new Set() };
    stores.set(slug, store);
  }
  return store;
}

function setState(slug: string, state: LikeState) {
  const store = stores.get(slug);
  if (!store) return;
  store.state = state;
  store.listeners.forEach((l) => l());
}

export function LikeButton({
  slug,
  initialLiked,
  initialCount,
  color,
  size = "sm",
  className,
}: {
  slug: string;
  initialLiked: boolean;
  initialCount: number;
  color: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const [initial] = useState<LikeState>(() => ({ liked: initialLiked, count: initialCount }));
  const store = storeFor(slug, initial);
  const state = useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    () => store.state,
    () => initial,
  );
  const [pop, setPop] = useState(0);

  const toggle = async () => {
    const previous = store.state;
    const next = { liked: !previous.liked, count: Math.max(0, previous.count + (previous.liked ? -1 : 1)) };
    setState(slug, next);
    if (next.liked) setPop((n) => n + 1);
    try {
      const res = await fetch(`/api/hearticles/${encodeURIComponent(slug)}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: next.liked }),
      });
      const data = (await res.json()) as { ok: boolean; count?: number };
      if (!res.ok || !data.ok) throw new Error("like failed");
      setState(slug, { liked: next.liked, count: data.count ?? next.count });
    } catch {
      setState(slug, previous);
    }
  };

  const lg = size === "lg";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike this hearticle" : "Like this hearticle"}
      className={cn(
        "focus-ring group inline-flex items-center gap-2 rounded-full border font-semibold tabular-nums transition active:scale-95",
        lg ? "px-5 py-2.5 text-base" : "px-3 py-1.5 text-sm",
        state.liked ? "border-transparent" : "border-white/15 text-foreground hover:bg-white/10",
        className,
      )}
      style={state.liked ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, color } : undefined}
    >
      <Heart
        key={pop}
        className={cn(lg ? "size-5" : "size-4", "transition-transform", pop > 0 && state.liked && "animate-heart-pop")}
        fill={state.liked ? "currentColor" : "none"}
      />
      {state.count > 0 ? state.count : lg ? "Like" : null}
    </button>
  );
}
