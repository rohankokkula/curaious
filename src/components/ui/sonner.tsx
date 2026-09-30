"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-right"
      // On phones toasts span the width at the bottom; lift them clear of
      // the tab bar and the home indicator instead of sitting under both.
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
      {...props}
    />
  );
}
