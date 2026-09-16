import Image from "next/image";

interface CuraiousLogoProps {
  className?: string;
  variant?: "table" | "chrome";
}

export function CuraiousLogo({
  className = "",
  variant = "table",
}: CuraiousLogoProps) {
  return (
    <Image
      src="/curaious-logo.svg"
      alt="curaious"
      width={variant === "table" ? 108 : 96}
      height={variant === "table" ? 24 : 20}
      className={className}
      priority
    />
  );
}
