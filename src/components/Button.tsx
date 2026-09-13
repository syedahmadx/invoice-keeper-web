import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-sunken hover:border-ink-faint",
  ghost:
    "bg-transparent text-ink-muted border border-transparent hover:bg-sunken hover:text-ink",
  danger:
    "bg-surface text-danger border border-danger-line hover:bg-danger-soft hover:border-danger",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-inherit " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function classesFor(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
): string {
  return [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks further clicks while an action is in flight. */
  loading?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classesFor(variant, size, className)}
      {...rest}
    >
      {loading ? <LoadingSpinner size={size === "sm" ? 12 : 14} /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

/** Same treatment as Button, for navigation rather than an action. */
export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={classesFor(variant, size, className)}>
      {children}
    </Link>
  );
}
