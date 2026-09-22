"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function GuideCard({
  icon,
  title,
  description,
  body,
  downloadHref,
}: {
  /** A rendered icon element (e.g. `<PenLine className="size-4.5" />`), not a component reference —
   * component references (like lucide-react's forwardRef objects) aren't serializable across the
   * server/client boundary, but a JSX element is. */
  icon: React.ReactNode;
  title: string;
  description: string;
  body: React.ReactNode;
  downloadHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-border bg-card p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </span>
        <p className="mt-3 font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={title} className="max-h-[85vh] max-w-lg overflow-y-auto">
          <div className="space-y-3 text-sm leading-relaxed text-muted [&_h4]:font-semibold [&_h4]:text-foreground [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
            {body}
          </div>
          {downloadHref ? (
            <Button asChild variant="outline" className="mt-5">
              <a href={downloadHref} download>
                <Download className="size-4" /> Download
              </a>
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
