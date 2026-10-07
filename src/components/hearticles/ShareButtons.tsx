"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { LinkedinIcon, XIcon } from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.04 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.4 9.4 0 0 1 6.67 2.77 9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.04.7C5.78.7.69 5.79.69 12.04c0 2 .52 3.95 1.52 5.67L.6 23.3l5.73-1.5a11.33 11.33 0 0 0 5.71 1.46h.01c6.25 0 11.34-5.09 11.35-11.34a11.27 11.27 0 0 0-3.33-8.02" />
    </svg>
  );
}

/** Share a hearticle: copy link, X, LinkedIn, WhatsApp, and the phone's own
 * share sheet where there is one. */
export function ShareButtons({ url, title, className }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const targets = [
    { label: "Share on X", icon: XIcon, href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}` },
    { label: "Share on LinkedIn", icon: LinkedinIcon, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: "Share on WhatsApp", icon: WhatsAppIcon, href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
  ];
  const btn =
    "flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-muted transition hover:border-white/30 hover:text-foreground";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        className={btn}
        aria-label="Copy link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard blocked: nothing to do */
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>
      {targets.map(({ label, icon: Icon, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={btn}>
          <Icon className="size-4" />
        </a>
      ))}
      <button
        type="button"
        className={cn(btn, "sm:hidden")}
        aria-label="Share"
        onClick={() => {
          if (navigator.share) void navigator.share({ title, url }).catch(() => {});
        }}
      >
        <Share2 className="size-4" />
      </button>
    </div>
  );
}
