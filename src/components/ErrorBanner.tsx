import type { ReactNode } from "react";
import { Button } from "./Button";

type ErrorBannerProps = {
  title?: string;
  message: string;
  /** Rendering a retry turns a dead end into a recoverable state. */
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  children?: ReactNode;
};

export function ErrorBanner({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Retry",
  onDismiss,
  children,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-danger-line bg-danger-soft p-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex gap-3">
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-danger"
        >
          <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 6v5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="10" cy="13.75" r="0.9" fill="currentColor" />
        </svg>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-danger">{title}</p>
          <p className="text-sm text-ink-muted">{message}</p>
          {children}
        </div>
      </div>
      {onRetry || onDismiss ? (
        <div className="flex shrink-0 gap-2 sm:pl-4">
          {onDismiss ? (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
          {onRetry ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
