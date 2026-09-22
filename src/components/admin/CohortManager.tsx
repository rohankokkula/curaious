"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Cohort } from "@/lib/cohort";

export function CohortManager({ cohorts, currentId }: { cohorts: Cohort[]; currentId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", startsOn: "", endsOn: "", capacity: 10, cloneFrom: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cloneFrom: form.cloneFrom || null }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; message?: string };
    setBusy(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't create the cohort.");
    toast.success("Cohort created");
    setOpen(false);
    if (json.id) select(json.id);
  }

  async function select(id: string) {
    await fetch("/api/admin/cohorts/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function act(id: string, action: "activate" | "archive") {
    const res = await fetch(`/api/admin/cohorts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return toast.error("couldn't update the cohort.");
    toast.success(action === "activate" ? "Cohort is now live for members" : "Cohort archived");
    router.refresh();
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New cohort</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cohorts.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="mt-0.5 text-sm text-muted">{c.starts_on} → {c.ends_on} · {c.capacity} seats</p>
              </div>
              <Badge variant={c.status === "active" ? "success" : c.status === "draft" ? "warning" : "default"}>{c.status}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant={c.id === currentId ? "dark" : "outline"} onClick={() => select(c.id)} disabled={c.id === currentId}>
                {c.id === currentId ? "Viewing" : "Manage"}
              </Button>
              {c.status !== "active" ? <Button size="sm" variant="outline" onClick={() => act(c.id, "activate")}>Make live</Button> : null}
              {c.status !== "archived" ? <Button size="sm" variant="ghost" onClick={() => act(c.id, "archive")}>Archive</Button> : null}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="New cohort">
          <form onSubmit={create} className="space-y-3">
            <label className="block text-sm font-medium">Name
              <Input className="mt-1.5" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Season 2" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Starts
                <Input className="mt-1.5" type="date" required value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} />
              </label>
              <label className="block text-sm font-medium">Ends
                <Input className="mt-1.5" type="date" required value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} />
              </label>
            </div>
            <label className="block text-sm font-medium">Seats
              <Input className="mt-1.5" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </label>
            <label className="block text-sm font-medium">Copy schedule from
              <select className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" value={form.cloneFrom} onChange={(e) => setForm({ ...form, cloneFrom: e.target.value })}>
                <option value="">Start empty</option>
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create cohort"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
