"use client";

import { Camera, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/dashboard/Avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import {
  resolveVisibility,
  VISIBILITY_LABELS,
  type Visibility,
  type VisibilityKey,
} from "@/lib/profile";

type Profile = {
  name: string;
  headline: string | null;
  location: string | null;
  bio: string | null;
  tags: string[];
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  visibility: unknown;
};

/** Grouped the way someone thinks about it, rather than in schema order. */
const VISIBILITY_GROUPS: { title: string; keys: VisibilityKey[] }[] = [
  { title: "About you", keys: ["headline", "location", "bio", "tags", "email"] },
  { title: "Links", keys: ["linkedin", "twitter", "github"] },
  { title: "Your talk", keys: ["talk", "recording", "scores", "feedback"] },
  { title: "Beyond the cohort", keys: ["showcase"] },
];

function VisibilityToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-surface">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-current"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {label}
          {checked ? (
            <Eye aria-hidden className="size-3.5 text-muted" />
          ) : (
            <EyeOff aria-hidden className="size-3.5 text-muted" />
          )}
        </span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

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
    linkedinUrl: profile.linkedin_url ?? "",
    twitterUrl: profile.twitter_url ?? "",
    githubUrl: profile.github_url ?? "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const [visibility, setVisibility] = useState<Visibility>(() =>
    resolveVisibility(profile.visibility),
  );

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
        visibility,
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
      <SheetContent
        title="Edit profile"
        description="Your details, and who gets to see them."
        className="max-w-lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-profile-form" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="edit-profile-form" onSubmit={save} className="space-y-4">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium">
              LinkedIn
              <Input className="mt-1.5" value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/in/…" />
            </label>
            <label className="block text-sm font-medium">
              X / Twitter
              <Input className="mt-1.5" value={form.twitterUrl} onChange={set("twitterUrl")} placeholder="https://x.com/…" />
            </label>
            <label className="block text-sm font-medium">
              GitHub
              <Input className="mt-1.5" value={form.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/…" />
            </label>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold">Who can see what</h4>
            <p className="mt-1 text-xs text-muted">
              Unticked stays private. You and the curator always see everything &mdash; this
              controls what the rest of the cohort sees.
            </p>

            <div className="mt-4 space-y-4">
              {VISIBILITY_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    {group.title}
                  </p>
                  <div className="mt-2 space-y-2">
                    {group.keys.map((key) => (
                      <VisibilityToggle
                        key={key}
                        label={VISIBILITY_LABELS[key].label}
                        hint={VISIBILITY_LABELS[key].hint}
                        checked={visibility[key]}
                        onChange={(next) => setVisibility((v) => ({ ...v, [key]: next }))}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {visibility.showcase ? (
              <p className="mt-3 rounded-lg bg-surface p-3 text-xs text-muted">
                The public page is readable by anyone who has the link, without signing in.
                Untick the last option to keep yourself off it.
              </p>
            ) : null}
          </div>
        </form>
      </SheetContent>
    </Dialog>
  );
}
