import type { ReactNode } from "react";

/** Shared input treatment so every control in the app matches. */
export const controlClasses =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors " +
  "hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 " +
  "disabled:bg-sunken disabled:text-ink-muted disabled:cursor-not-allowed";

type FieldShellProps = {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** Label, control and message stacked. Use for controls Field cannot render. */
export function FieldShell({
  htmlFor,
  label,
  hint,
  error,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-wide text-ink-muted"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "url";
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Right-aligns and uses tabular figures, for money and quantities. */
  numeric?: boolean;
  step?: string;
  disabled?: boolean;
  className?: string;
};

export function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  error,
  numeric = false,
  step,
  disabled = false,
  className,
}: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <FieldShell
      htmlFor={id}
      label={label}
      hint={hint}
      error={error}
      className={className}
    >
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={type === "number" ? "decimal" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={[
          controlClasses,
          numeric ? "text-right numeric" : "",
          error ? "border-danger focus:border-danger focus:ring-danger/20" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </FieldShell>
  );
}
