type ProviderTagProps = {
  /** Name of the model provider that produced the panel's contents. */
  provider: string;
  /** What it did, e.g. "extracted" or "reviewed". */
  action?: string;
};

/** Attribution so the user always knows which model produced what they are reading. */
export function ProviderTag({ provider, action }: ProviderTagProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2 py-0.5 text-[11px] text-ink-muted">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-accent/60"
      />
      {action ? `${action} by ` : ""}
      <span className="font-medium text-ink">{provider}</span>
    </span>
  );
}
