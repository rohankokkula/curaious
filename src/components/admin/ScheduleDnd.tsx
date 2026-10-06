"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import type { DayPalette } from "@/components/dashboard/seasonLayout";
import { TitleCover } from "@/components/dashboard/TalkCover";
import { cn } from "@/lib/utils";

/**
 * Curator drag-and-drop on the schedule timeline: pick up a booked talk and
 * drop it on an open seat (moves it to that slot) or on another talk (the two
 * swap). While dragging, the card you're holding takes on the color of the
 * day you're over, so you see where it will land before letting go.
 */

export type DragTalk = {
  talkId: string;
  slotId: string;
  title: string;
  speaker: string | null;
  speakerAvatarUrl: string | null;
  number: number;
  palette: DayPalette;
};

type DropTarget =
  | { kind: "open"; slotId: string; palette: DayPalette }
  | { kind: "talk"; talkId: string; slotId: string; palette: DayPalette };

/** Keeps the held card centered under the pointer, wherever on the tile
 * it was grabbed. */
const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!activatorEvent || !draggingNodeRect) return transform;
  const point = getEventCoordinates(activatorEvent);
  if (!point) return transform;
  return {
    ...transform,
    x: transform.x + point.x - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + point.y - draggingNodeRect.top - draggingNodeRect.height / 2,
  };
};

/** Lets a tile swallow the click that ends a drag, so dropping a card that
 * is also a link doesn't navigate to the talk. */
const JustDraggedContext = createContext<() => boolean>(() => false);

export function ScheduleDndProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<DragTalk | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);
  const draggedAt = useRef(0);
  // false while hydrating (matches the server), true right after
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  async function call(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) throw new Error(json.message ?? "couldn't move that.");
  }

  async function onDragEnd(event: DragEndEvent) {
    draggedAt.current = Date.now();
    const talk = event.active.data.current as DragTalk | undefined;
    const target = event.over?.data.current as DropTarget | undefined;
    setActive(null);
    setOver(null);
    if (!talk || !target) return;
    if (target.kind === "talk" && target.talkId === talk.talkId) return;
    const sameSession = target.slotId === talk.slotId;
    if (target.kind === "open" && target.slotId === talk.slotId) return;

    try {
      if (target.kind === "open") {
        await call(`/api/admin/talks/${talk.talkId}/move`, { slotId: target.slotId });
        toast.success("Talk moved");
      } else {
        await call(`/api/admin/talks/${talk.talkId}/swap`, { otherTalkId: target.talkId });
        toast.success(sameSession ? "Order swapped" : "Talks swapped");
      }
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <JustDraggedContext.Provider value={() => Date.now() - draggedAt.current < 400}>
      {/* a fixed id: dnd-kit otherwise numbers its aria ids from a global
          counter, which differs between server and client (hydration mismatch) */}
      <DndContext
        id="schedule-timeline"
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActive((e.active.data.current as DragTalk) ?? null)}
        onDragOver={(e: DragOverEvent) => setOver((e.over?.data.current as DropTarget) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActive(null);
          setOver(null);
        }}
      >
        <div className={cn("transition-opacity", pending && "pointer-events-none opacity-70")}>{children}</div>

        {/* Portaled to <body>: the page's fade-in leaves a transform on an
            ancestor, which made the fixed-position overlay draw offset from
            the pointer. */}
        {isClient
          ? createPortal(
              <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]} zIndex={60}>
                {active ? (
                  // solid backing, so nothing on the page shows through the held card
                  <div className="w-56 rotate-2 cursor-grabbing rounded-lg bg-card shadow-2xl ring-1 ring-black/20">
                  <div className={cn("rounded-lg border p-2", (over?.palette ?? active.palette).tile)}>
                    <div className={cn("relative aspect-video overflow-hidden rounded-md border", (over?.palette ?? active.palette).well)}>
                      <TitleCover
                        title={active.title}
                        speaker={active.speaker}
                        speakerAvatarUrl={active.speakerAvatarUrl}
                        status={null}
                        number={active.number}
                        palette={over?.palette ?? active.palette}
                      />
                    </div>
                  </div>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>
    </JustDraggedContext.Provider>
  );
}

/** A booked talk: can be picked up, and is also a drop target (to swap). */
export function DraggableTalk({ talk, children }: { talk: DragTalk; children: React.ReactNode }) {
  const justDragged = useContext(JustDraggedContext);
  const { setNodeRef: setDragRef, listeners, attributes, isDragging } = useDraggable({ id: `talk:${talk.talkId}`, data: talk });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `swap:${talk.talkId}`,
    data: { kind: "talk", talkId: talk.talkId, slotId: talk.slotId, palette: talk.palette } satisfies DropTarget,
  });

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      {...listeners}
      {...attributes}
      onClickCapture={(e) => {
        if (justDragged()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={cn(
        "relative cursor-grab touch-manipulation rounded-lg transition active:cursor-grabbing",
        isDragging && "opacity-30",
        isOver && !isDragging && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background",
      )}
      title="Drag to move or swap"
    >
      {children}
    </div>
  );
}

/** An open seat: drop a talk here to move it into this slot. */
export function DroppableSeat({
  slotId,
  seat,
  palette,
  children,
}: {
  slotId: string;
  seat: number;
  palette: DayPalette;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `open:${slotId}:${seat}`, data: { kind: "open", slotId, palette } satisfies DropTarget });
  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-lg transition", isOver && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background")}
    >
      {children}
    </div>
  );
}
