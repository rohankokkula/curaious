"use client";

import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical, Mic, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { EditorSlot } from "@/lib/schedule";
import { SLOT_TYPES } from "@/lib/talks";
import { cn } from "@/lib/utils";

const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  if (!res.ok || !json.ok) throw new Error(json.message ?? "something went wrong.");
}

function TalkChip({ talk }: { talk: NonNullable<EditorSlot["talk"]> }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `talk:${talk.id}` });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md bg-primary-soft px-2 py-1.5 text-xs active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <Mic className="size-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{talk.presenter}</span> · {talk.title}
      </span>
      {talk.status === "pending" ? <Badge variant="warning">pending</Badge> : null}
    </div>
  );
}

function SlotCard({ slot, onEdit, onDelete }: { slot: EditorSlot; onEdit: () => void; onDelete: () => void }) {
  const drag = useDraggable({ id: `slot:${slot.id}` });
  const drop = useDroppable({ id: `slot:${slot.id}` });
  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      className={cn(
        "rounded-lg border border-border bg-card p-3 transition",
        drop.isOver && "border-primary ring-2 ring-primary/30",
        drag.isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Drag ${slot.label}`}
          className="mt-0.5 cursor-grab text-muted hover:text-foreground active:cursor-grabbing"
          {...drag.listeners}
          {...drag.attributes}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold capitalize">{slot.label}</p>
          <p className="text-xs text-muted">
            {slot.type}
            {slot.startsAt ? ` · ${slot.startsAt.slice(0, 5)}${slot.endsAt ? `–${slot.endsAt.slice(0, 5)}` : ""}` : ""}
          </p>
        </div>
        <button type="button" aria-label="Edit slot" onClick={onEdit} className="rounded p-1 text-muted hover:bg-surface">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" aria-label="Delete slot" onClick={onDelete} className="rounded p-1 text-muted hover:bg-surface hover:text-destructive">
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {slot.type === "talk" ? (
        <div className="mt-2">
          {slot.talk ? (
            <TalkChip talk={slot.talk} />
          ) : (
            <p className="rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted">Open — drop a talk here</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DayColumn({ date, children, onAdd }: { date: string; children: React.ReactNode; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-xl border border-border bg-surface p-3",
        isOver && "border-primary ring-2 ring-primary/30",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{fmtDay(date)}</p>
      {children}
      <Button variant="ghost" size="sm" onClick={onAdd} className="justify-start">
        <Plus className="size-3.5" /> Add slot
      </Button>
    </div>
  );
}

type Draft = { id: string | null; date: string; type: EditorSlot["type"]; label: string; startsAt: string; endsAt: string };

export function ScheduleEditor({ cohortId, initial }: { cohortId: string; initial: EditorSlot[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState(initial);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const dates = [...new Set(slots.map((s) => s.date))].sort();
  const byDate = (d: string) => slots.filter((s) => s.date === d).sort((a, b) => a.sortOrder - b.sortOrder);

  async function persist<T>(next: EditorSlot[], previous: EditorSlot[], run: () => Promise<T>, ok?: string) {
    setSlots(next);
    try {
      await run();
      if (ok) toast.success(ok);
      router.refresh();
    } catch (e) {
      setSlots(previous);
      toast.error((e as Error).message);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActive(null);
    const from = String(event.active.id);
    const over = event.over ? String(event.over.id) : null;
    if (!over || from === over) return;

    if (from.startsWith("slot:")) {
      const id = from.slice(5);
      const moving = slots.find((s) => s.id === id);
      if (!moving) return;
      let date: string;
      let beforeId: string | null = null;
      if (over.startsWith("day:")) date = over.slice(4);
      else {
        const target = slots.find((s) => s.id === over.slice(5));
        if (!target) return;
        date = target.date;
        beforeId = target.id;
      }
      const rest = slots.filter((s) => s.id !== id);
      const ordered = [...rest].sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder);
      const moved = { ...moving, date };
      const idx = beforeId ? ordered.findIndex((s) => s.id === beforeId) : ordered.reduce((n, s, i) => (s.date <= date ? i + 1 : n), 0);
      ordered.splice(idx < 0 ? ordered.length : idx, 0, moved);
      const next = ordered.map((s, i) => ({ ...s, sortOrder: i + 1 }));
      void persist(next, slots, () =>
        call("/api/admin/slots/reorder", "POST", { items: next.map((s) => ({ id: s.id, date: s.date, sort_order: s.sortOrder })) }),
      );
    } else if (from.startsWith("talk:") && over.startsWith("slot:")) {
      const talkId = from.slice(5);
      const source = slots.find((s) => s.talk?.id === talkId);
      const target = slots.find((s) => s.id === over.slice(5));
      if (!source || !target || source.id === target.id) return;
      if (target.type !== "talk") return toast.error("Talks can only go in talk slots.");
      const next = slots.map((s) =>
        s.id === source.id ? { ...s, talk: target.talk } : s.id === target.id ? { ...s, talk: source.talk } : s,
      );
      void persist(next, slots, () => call(`/api/admin/talks/${talkId}/move`, "POST", { slotId: target.id }), "Talk moved");
    }
  }

  async function saveDraft() {
    if (!draft) return;
    const body = { date: draft.date, type: draft.type, label: draft.label, startsAt: draft.startsAt || null, endsAt: draft.endsAt || null };
    try {
      if (draft.id) await call(`/api/admin/slots/${draft.id}`, "PATCH", body);
      else await call("/api/admin/slots", "POST", { ...body, cohortId });
      toast.success("Slot saved");
      setDraft(null);
      router.refresh();
      // refresh() re-renders the server page; sync local state from the new props via key remount.
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(slot: EditorSlot) {
    if (slot.talk) return toast.error("This slot has a talk. Move the talk first.");
    const previous = slots;
    void persist(slots.filter((s) => s.id !== slot.id), previous, () => call(`/api/admin/slots/${slot.id}`, "DELETE"), "Slot deleted");
  }

  const overlay = active?.startsWith("slot:") ? slots.find((s) => s.id === active.slice(5))?.label : active?.startsWith("talk:") ? "Talk" : null;
  const blank = (date: string): Draft => ({ id: null, date, type: "talk", label: "", startsAt: "", endsAt: "" });

  return (
    <>
      <div className="mb-4 flex justify-between gap-3">
        <p className="text-sm text-muted">Drag slots between days to reorder. Drag a talk onto another slot to move or swap it.</p>
        <Button onClick={() => setDraft(blank(dates[0] ?? new Date().toISOString().slice(0, 10)))}>
          <Plus className="size-4" /> Add slot
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActive(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {dates.map((date) => (
            <DayColumn key={date} date={date} onAdd={() => setDraft(blank(date))}>
              {byDate(date).map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  onEdit={() => setDraft({ id: slot.id, date: slot.date, type: slot.type, label: slot.label, startsAt: slot.startsAt?.slice(0, 5) ?? "", endsAt: slot.endsAt?.slice(0, 5) ?? "" })}
                  onDelete={() => remove(slot)}
                />
              ))}
            </DayColumn>
          ))}
          {dates.length === 0 ? <p className="text-sm text-muted">No slots yet. Add the first one.</p> : null}
        </div>
        <DragOverlay>{overlay ? <div className="rounded-lg border border-primary bg-card px-3 py-2 text-sm font-semibold capitalize shadow-lg">{overlay}</div> : null}</DragOverlay>
      </DndContext>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft?.id ? "Edit slot" : "Add slot"}>
          {draft ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Label
                <Input className="mt-1.5" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Talk 1a" />
              </label>
              <label className="block text-sm font-medium">Type
                <select className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}>
                  {SLOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Date
                <Input className="mt-1.5" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">Starts
                  <Input className="mt-1.5" type="time" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} />
                </label>
                <label className="block text-sm font-medium">Ends
                  <Input className="mt-1.5" type="time" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={saveDraft} disabled={!draft.label.trim() || !draft.date}>Save</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
