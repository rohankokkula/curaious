import { cn } from "@/lib/utils";

interface SectionProps extends React.ComponentProps<"section"> {
  children: React.ReactNode;
}

/** Shared vertical rhythm + measure for every homepage section. */
export function Section({ className, children, ...rest }: SectionProps) {
  return (
    <section
      className={cn(
        "border-t border-border/40 px-5 py-20 md:px-8 md:py-32",
        className,
      )}
      {...rest}
    >
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

interface SectionKickerProps extends React.ComponentProps<"p"> {
  index: string;
  label: string;
}

export function SectionKicker({
  index,
  label,
  className,
  ...rest
}: SectionKickerProps) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted",
        className,
      )}
      {...rest}
    >
      <span className="text-accent">{index}</span>
      <span aria-hidden className="h-px w-8 bg-border" />
      <span>{label}</span>
    </p>
  );
}

export function SectionTitle({
  className,
  children,
  ...rest
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "heading-display text-balance text-3xl leading-[1.15] md:text-5xl md:leading-[1.1]",
        className,
      )}
      {...rest}
    >
      {children}
    </h2>
  );
}
