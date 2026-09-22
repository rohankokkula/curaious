"use client";

import { Camera, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/dashboard/Avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";

type Profile = {
  name: string;
  headline: string | null;
  location: string | null;
  bio: string | null;
  tags: string[];
  avatar_url: string | null;
};

/** Center-crop to a 512px square JPEG so uploads stay small and consistent. */
async function squareResize(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(512, side);
  canvas.getContext("2d")!.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("resize failed");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export function EditProfileDialog({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(profile.avatar_url);
  const [form, setForm] = useState({
    name: profile.name,
    headline: profile.headline ?? "",
    location: profile.location ?? "",
    bio: profile.bio ?? "",
    tags: profile.tags.join(", "),
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function uploadPhoto(file: File) {
    try {
      const body = new FormData();
      body.append("file", await squareResize(file));
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const json = (await res.json()) as { ok?: boolean; url?: string; message?: string };
      if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't upload that.");
      setPhoto(json.url ?? null);
      toast.success("Photo updated");
      router.refresh();
    } catch {
      toast.error("couldn't read that image.");
    }
  }

  async function removePhoto() {
    await fetch("/api/profile/avatar", { method: "DELETE" });
    setPhoto(null);
    router.refresh();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setSaving(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't save your profile.");
    toast.success("Profile saved");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent title="Edit profile" className="max-h-[90vh] max-w-lg overflow-y-auto">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={form.name || profile.name} src={photo} size="lg" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Camera className="size-4" /> {photo ? "Change photo" : "Add photo"}
              </Button>
              {photo ? (
                <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPhoto(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <label className="block text-sm font-medium">
            Name
            <Input className="mt-1.5" value={form.name} onChange={set("name")} required maxLength={80} />
          </label>
          <label className="block text-sm font-medium">
            Headline
            <Input className="mt-1.5" value={form.headline} onChange={set("headline")} maxLength={120} placeholder="Developer Advocate · Builder" />
          </label>
          <label className="block text-sm font-medium">
            Location
            <Input className="mt-1.5" value={form.location} onChange={set("location")} maxLength={80} />
          </label>
          <label className="block text-sm font-medium">
            Bio
            <Textarea className="mt-1.5" value={form.bio} onChange={set("bio")} maxLength={600} rows={4} />
          </label>
          <label className="block text-sm font-medium">
            Interests <span className="font-normal text-muted">(comma separated, up to 8)</span>
            <Input className="mt-1.5" value={form.tags} onChange={set("tags")} placeholder="AI, Open Source, Community" />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
