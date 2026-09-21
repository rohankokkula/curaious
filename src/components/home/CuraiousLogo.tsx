import Image from "next/image";
import { cn } from "@/lib/utils";

interface CuraiousLogoProps {
  className?: string;
  /** Logo artwork is dark; inverted by default so it reads on the dark page. */
  invert?: boolean;
}

export function CuraiousLogo({ className, invert = true }: CuraiousLogoProps) {
  return (
    <Image
      src="/curaious-logo.svg"
      alt="curaious"
      width={132}
      height={28}
      className={cn("h-auto w-auto", invert && "invert", className)}
      priority
    />
  );
}
