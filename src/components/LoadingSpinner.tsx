type LoadingSpinnerProps = {
  /** Edge length in pixels. */
  size?: number;
  className?: string;
  label?: string;
};

/** Indeterminate progress ring. Inherits the current text colour. */
export function LoadingSpinner({
  size = 16,
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? "Loading"}
      className={["inline-flex shrink-0", className].filter(Boolean).join(" ")}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="animate-spin"
      >
        <circle
          cx="8"
          cy="8"
          r="6.5"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.25"
        />
        <path
          d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
