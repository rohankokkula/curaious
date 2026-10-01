"use client";

import { UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Curator-only, on a member's profile: takes them out of the current
 * cohort (same call as the admin Members table; reversible from there). */
export function RemoveMemberButton({ cohortId, profileId, name }: { cohortId: string; profileId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Remove ${name} from this cohort? You can restore them from Admin → Members.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/members/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohortId, status: "removed" }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("couldn't remove that member.");
    toast.success(`${name} removed from the cohort`);
    router.push("/dashboard/members");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void remove()}
      disabled={busy}
      className="text-destructive hover:text-destructive"
    >
      <UserMinus className="size-4" /> {busy ? "Removing…" : "Remove"}
    </Button>
  );
}
