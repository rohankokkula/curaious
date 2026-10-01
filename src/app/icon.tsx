import { renderMarkIcon } from "@/lib/og/render";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser-tab icon: the wordmark's underlined "ai" on near-black. */
export default function Icon() {
  return renderMarkIcon(size.width);
}
