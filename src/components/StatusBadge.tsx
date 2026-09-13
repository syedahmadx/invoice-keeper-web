import type { InvoiceStatus } from "@/types/invoice";

const STATUS_STYLES: Record<InvoiceStatus, { label: string; className: string }> =
  {
    draft: {
      label: "Draft",
      className: "bg-sunken text-ink-muted border-line-strong",
    },
    sent: {
      label: "Sent",
      className: "bg-ok-soft text-ok border-ok-line",
    },
  };

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
