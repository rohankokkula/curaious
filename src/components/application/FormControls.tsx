import { cn } from "@/lib/utils";

interface FormShellProps {
  children: React.ReactNode;
  className?: string;
  direction?: "forward" | "back";
}

export function FormShell({
  children,
  className,
}: FormShellProps) {
  return (
    <div className={cn("space-y-5 opacity-100 transition-opacity duration-500", className)}>
      {children}
    </div>
  );
}

interface FormQuestionProps {
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
}

export function FormQuestion({ children, className, eyebrow }: FormQuestionProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? <p className="story-whisper">{eyebrow}</p> : null}
      <h2 className="form-question">{children}</h2>
    </div>
  );
}

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, className, id, ...props }: FormFieldProps) {
  const inputId = id || props.name;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="form-label">
        {label}
      </label>
      <input
        id={inputId}
        className={cn("form-input", error && "border-accent", className)}
        {...props}
      />
      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  );
}

interface LargeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  eyebrow?: string;
}

export function LargeInput({
  label,
  error,
  eyebrow,
  className,
  id,
  ...props
}: LargeInputProps) {
  const inputId = id || props.name;

  return (
    <div className="space-y-3">
      {eyebrow ? <p className="story-whisper">{eyebrow}</p> : null}
      <label htmlFor={inputId} className="form-question block">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "form-input text-xl md:text-2xl",
          error && "border-accent",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  );
}

interface LargeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: React.ReactNode;
  helper?: React.ReactNode;
  error?: string;
  eyebrow?: string;
}

export function LargeTextarea({
  label,
  helper,
  error,
  eyebrow,
  className,
  id,
  ...props
}: LargeTextareaProps) {
  const inputId = id || props.name;

  return (
    <div className="space-y-3">
      {eyebrow ? <p className="story-whisper">{eyebrow}</p> : null}
      <label htmlFor={inputId} className="form-question block">
        {label}
      </label>
      {helper ? <p className="text-base leading-relaxed text-muted">{helper}</p> : null}
      <textarea
        id={inputId}
        className={cn("form-textarea", error && "border-accent", className)}
        {...props}
      />
      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  );
}

interface ChoiceOptionProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
}

export function ChoiceOption({
  selected,
  onSelect,
  title,
  description,
}: ChoiceOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "focus-ring w-full border-b py-3 text-left transition",
        selected
          ? "border-accent text-foreground"
          : "border-border/40 text-muted hover:border-border hover:text-foreground",
      )}
      aria-pressed={selected}
    >
      <span className="block text-base md:text-lg">{title}</span>
      {description ? (
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      ) : null}
    </button>
  );
}

interface FormActionsProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}

export function FormActions({
  onBack,
  onNext,
  nextLabel = "continue",
  backLabel = "back",
  nextDisabled,
  showBack = true,
}: FormActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-5 pt-4">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="focus-ring text-sm text-muted transition hover:text-foreground"
        >
          {backLabel}
        </button>
      ) : null}
      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="focus-ring border-b border-foreground pb-0.5 text-sm text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  );
}
