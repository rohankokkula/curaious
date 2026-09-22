"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MemberRowActions({ cohortId, profileId, status, isSelf }: { cohortId: string; profileId: string; status: string; isSelf: boolean }) {
  const router = useRouter();
  if (isSelf) return <span className="text-xs text-muted">You</span>;
  const next = status === "removed" ? "active" : "removed";

  async function toggle() {
    const res = await fetch(`/api/admin/members/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohortId, status: next }),
    });
    if (!res.ok) return toast.error("couldn't update that member.");
    toast.success(next === "removed" ? "Member removed from cohort" : "Member restored");
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={toggle}>
      {next === "removed" ? "Remove" : "Restore"}
    </Button>
  );
}
