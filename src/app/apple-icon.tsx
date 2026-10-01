import { renderMarkIcon } from "@/lib/og/render";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon on iOS ("Add to Home Screen"). */
export default function AppleIcon() {
  return renderMarkIcon(size.width, { rounded: false });
}
