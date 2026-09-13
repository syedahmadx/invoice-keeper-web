"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FindingsList } from "@/components/FindingsList";
import { StatusBadge } from "@/components/StatusBadge";
import { postJson, type SendResponse } from "@/lib/client";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  sumLineItems,
} from "@/lib/format";
import { useHydrated, useInvoices, useWebhookUrl } from "@/lib/hooks";
import { deleteInvoice, updateInvoice } from "@/lib/storage";
import { REVIEW_PROVIDER } from "@/lib/providers/config";
import type { ProcessedInvoice } from "@/types/invoice";

export default function InvoiceDetailPage(
  props: PageProps<"/invoices/[id]">,
) {
  const { id } = use(props.params);
  const router = useRouter();

  const hydrated = useHydrated();
  const invoices = useInvoices();
  const webhookUrl = useWebhookUrl();

  const invoice = useMemo<ProcessedInvoice | null>(
    () => invoices.find((candidate) => candidate.id === id) ?? null,
    [invoices, id],
  );

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const inFlight = useRef(false);

  async function resend() {
    if (inFlight.current || !invoice || webhookUrl === "") return;
    inFlight.current = true;
    setSending(true);
    setSendError("");

    try {
      const sentAt = new Date().toISOString();
      const result = await postJson<SendResponse>("/api/send", {
        webhookUrl,
        payload: {
          source: "invoice-keeper",
          id: invoice.id,
          fileName: invoice.fileName,
          sentAt,
          invoice: invoice.extracted,
          findings: invoice.findings,
        },
      });

      if (!result.ok) {
        setSendError(
          `The webhook replied with ${result.status}. ${
            result.body ? result.body.slice(0, 300) : "No response body."
          }`,
        );
        return;
      }

      updateInvoice(invoice.id, { status: "sent", sentAt });
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Send failed.");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  function remove() {
    if (!invoice) return;
    deleteInvoice(invoice.id);
    router.push("/invoices");
  }

  if (!hydrated) {
    return <div className="h-48 animate-pulse rounded-xl border border-line bg-surface" />;
  }

  if (invoice === null) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          title="Invoice not found"
          description="This invoice is not in this browser's storage. It may have been deleted, or saved in a different browser."
          action={
            <ButtonLink href="/invoices" variant="secondary">
              Back to invoices
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const { extracted } = invoice;
  const lineItemsTotal = sumLineItems(extracted.lineItems);

  return (
    <div className="space-y-8">
      <BackLink />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {extracted.supplier || "Unnamed supplier"}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-ink-muted">
            Invoice{" "}
            <span className="font-mono text-xs text-ink">
              {extracted.invoiceNumber || "—"}
            </span>{" "}
            · saved {formatDateTime(invoice.createdAt)}
            {invoice.sentAt ? ` · sent ${formatDateTime(invoice.sentAt)}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {invoice.status === "draft" ? (
            <Button
              variant="primary"
              size="sm"
              loading={sending}
              disabled={sending || webhookUrl === ""}
              onClick={() => void resend()}
            >
              Send to webhook
            </Button>
          ) : null}
          {confirmingDelete ? (
            <>
              <Button size="sm" variant="danger" onClick={remove}>
                Confirm delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </header>

      {invoice.status === "draft" && webhookUrl === "" ? (
        <p className="rounded-lg border border-warn-line bg-warn-soft px-4 py-3 text-sm text-ink">
          <span className="font-semibold text-warn">No webhook configured.</span>{" "}
          Add a destination URL in{" "}
          <Link
            href="/settings"
            className="font-medium text-accent underline underline-offset-2"
          >
            Settings
          </Link>{" "}
          to send this draft.
        </p>
      ) : null}

      {sendError ? (
        <ErrorBanner
          title="Could not send"
          message={sendError}
          onRetry={() => void resend()}
          onDismiss={() => setSendError("")}
        />
      ) : null}

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <header className="border-b border-line bg-sunken px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-ink">Extracted data</h2>
        </header>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
          <Detail label="Supplier" value={extracted.supplier || "—"} />
          <Detail label="Supplier tax ID" value={extracted.supplierTaxId ?? "—"} mono />
          <Detail label="Invoice number" value={extracted.invoiceNumber || "—"} mono />
          <Detail label="Currency" value={extracted.currency} mono />
          <Detail label="Issue date" value={formatDate(extracted.issueDate)} />
          <Detail label="Due date" value={formatDate(extracted.dueDate)} />
          <Detail label="Source file" value={invoice.fileName} className="sm:col-span-2" />
        </dl>

        <div className="border-t border-line px-4 py-4 sm:px-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Line items</h3>

          {extracted.lineItems.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No line items were recorded for this invoice.
            </p>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-line md:block">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-sunken text-left">
                      <th scope="col" className="w-[50%] px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                        Description
                      </th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
                        Qty
                      </th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
                        Unit price
                      </th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {extracted.lineItems.map((item, index) => (
                      <tr key={index} className="border-b border-line last:border-b-0">
                        <td className="px-3 py-2.5 text-ink">
                          {item.description || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-ink-muted numeric">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right text-ink-muted numeric">
                          {formatMoney(item.unitPrice, extracted.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-ink numeric">
                          {formatMoney(item.amount, extracted.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="space-y-2 md:hidden">
                {extracted.lineItems.map((item, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-line p-3 text-sm"
                  >
                    <p className="text-ink">{item.description || "—"}</p>
                    <p className="mt-1 flex items-center justify-between text-xs text-ink-muted">
                      <span className="numeric">
                        {item.quantity} ×{" "}
                        {formatMoney(item.unitPrice, extracted.currency)}
                      </span>
                      <span className="text-sm font-medium text-ink numeric">
                        {formatMoney(item.amount, extracted.currency)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="border-t border-line bg-sunken px-4 py-4 sm:px-5">
          <dl className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <Total
              label="Line items"
              value={formatMoney(lineItemsTotal, extracted.currency)}
              muted
            />
            <Total
              label="Subtotal"
              value={formatMoney(extracted.subtotal, extracted.currency)}
            />
            <Total
              label="Tax"
              value={formatMoney(extracted.tax, extracted.currency)}
            />
            <div className="border-t border-line-strong pt-2">
              <Total
                label="Total"
                value={formatMoney(extracted.total, extracted.currency)}
                strong
              />
            </div>
          </dl>
        </div>
      </section>

      <FindingsList findings={invoice.findings} provider={REVIEW_PROVIDER} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/invoices"
      className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M8.5 3 4.5 7l4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      All invoices
    </Link>
  );
}

function Detail({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd
        className={[
          "mt-1 break-words text-sm text-ink",
          mono ? "font-mono text-xs" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function Total({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-ink-faint" : "text-ink-muted"}>{label}</dt>
      <dd
        className={[
          "numeric",
          strong ? "text-base font-semibold text-ink" : "",
          muted ? "text-ink-faint" : "text-ink",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
