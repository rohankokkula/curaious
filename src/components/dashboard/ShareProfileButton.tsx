"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareProfileButton() {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Profile link copied");
        } catch {
          toast.error("Couldn't copy the link");
        }
      }}
    >
      <Share2 className="size-4" /> Share profile
    </Button>
  );
}
