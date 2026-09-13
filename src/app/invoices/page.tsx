"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { controlClasses } from "@/components/Field";
import { formatDate, formatMoney, roundMoney } from "@/lib/format";
import { useHydrated, useInvoices } from "@/lib/hooks";
import type { InvoiceStatus } from "@/types/invoice";

type StatusFilter = "all" | InvoiceStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "sent", label: "Sent" },
];

export default function InvoicesPage() {
  const hydrated = useHydrated();
  const invoices = useInvoices();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (status !== "all" && invoice.status !== status) return false;
      if (needle === "") return true;
      return (
        invoice.extracted.supplier.toLowerCase().includes(needle) ||
        invoice.extracted.invoiceNumber.toLowerCase().includes(needle)
      );
    });
  }, [invoices, query, status]);

  /**
   * Totals are grouped by currency: adding EUR to USD would produce a number
   * that looks authoritative and means nothing.
   */
  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const invoice of filtered) {
      const currency = invoice.extracted.currency || "—";
      totals.set(
        currency,
        roundMoney((totals.get(currency) ?? 0) + invoice.extracted.total),
      );
    }
    return [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="h-32 animate-pulse rounded-xl border border-line bg-surface" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <EmptyState
          title="No invoices saved yet"
          description="Invoices you save or send appear here. They are stored in this browser only."
          action={
            <ButtonLink href="/scan" variant="primary">
              Scan an invoice
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="invoice-search" className="sr-only">
            Filter by supplier or invoice number
          </label>
          <input
            id="invoice-search"
            type="search"
            value={query}
            placeholder="Filter by supplier or invoice number"
            onChange={(event) => setQuery(event.target.value)}
            className={controlClasses}
          />
        </div>
        <div
          role="group"
          aria-label="Filter by status"
          className="flex rounded-md border border-line-strong bg-surface p-0.5"
        >
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
              className={[
                "flex-1 rounded px-3 py-1.5 text-sm transition-colors sm:flex-none",
                status === option.value
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          description="Try a different supplier name or invoice number, or clear the status filter."
        />
      ) : (
        <>
          {/* Wide: table. Narrow: cards — an invoice row has five facts and
              none of them should be scrolled out of view. */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken text-left">
                  <Th className="w-[18%]">Date</Th>
                  <Th className="w-[32%]">Supplier</Th>
                  <Th className="w-[20%]">Invoice no.</Th>
                  <Th className="w-[18%] text-right">Total</Th>
                  <Th className="w-[12%] text-right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-line transition-colors last:border-b-0 hover:bg-sunken"
                  >
                    <td className="px-4 py-3 text-ink-muted numeric">
                      {formatDate(invoice.extracted.issueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {invoice.extracted.supplier || "Unnamed supplier"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {invoice.extracted.invoiceNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-ink numeric">
                      {formatMoney(
                        invoice.extracted.total,
                        invoice.extracted.currency,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {filtered.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="block space-y-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-ink">
                      {invoice.extracted.supplier || "Unnamed supplier"}
                    </span>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 space-y-0.5 text-xs text-ink-muted">
                      <p className="numeric">
                        {formatDate(invoice.extracted.issueDate)}
                      </p>
                      <p className="truncate font-mono">
                        {invoice.extracted.invoiceNumber || "No number"}
                      </p>
                    </div>
                    <span className="shrink-0 text-base font-semibold text-ink numeric">
                      {formatMoney(
                        invoice.extracted.total,
                        invoice.extracted.currency,
                      )}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg border border-line bg-sunken px-4 py-3">
            <span className="text-sm text-ink-muted">
              {filtered.length} of {invoices.length}{" "}
              {invoices.length === 1 ? "invoice" : "invoices"}
            </span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {totalsByCurrency.map(([currency, total]) => (
                <span key={currency} className="text-sm">
                  <span className="text-ink-muted">Total </span>
                  <span className="font-semibold text-ink numeric">
                    {formatMoney(total, currency)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageHeading() {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Invoices
      </h1>
      <p className="text-sm text-ink-muted">
        Everything you have saved or sent from this browser.
      </p>
    </header>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={[
        "px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </th>
  );
}
