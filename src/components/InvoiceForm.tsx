"use client";

import type { ExtractedInvoice, InvoiceLineItem } from "@/types/invoice";
import { formatMoney, moneyMatches, roundMoney } from "@/lib/format";
import { Field, FieldShell, controlClasses } from "./Field";
import { LineItemsTable } from "./LineItemsTable";
import { NumberInput } from "./NumberInput";
import { ProviderTag } from "./ProviderTag";

type InvoiceFormProps = {
  value: ExtractedInvoice;
  onChange: (value: ExtractedInvoice) => void;
  /** Which model produced these values. */
  provider: string;
  disabled?: boolean;
};

const numericFieldClasses = `${controlClasses} text-right numeric`;

export function InvoiceForm({
  value,
  onChange,
  provider,
  disabled = false,
}: InvoiceFormProps) {
  function set<K extends keyof ExtractedInvoice>(
    key: K,
    fieldValue: ExtractedInvoice[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  function setLineItems(lineItems: InvoiceLineItem[]) {
    onChange({ ...value, lineItems });
  }

  const computedTotal = roundMoney(value.subtotal + value.tax);
  const totalMatches = moneyMatches(computedTotal, value.total);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Extracted invoice</h2>
          <p className="text-xs text-ink-muted">
            Check every field against the document before sending.
          </p>
        </div>
        <ProviderTag provider={provider} action="extracted" />
      </header>

      <div className="space-y-7 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="supplier"
            label="Supplier"
            value={value.supplier}
            disabled={disabled}
            placeholder="Who issued this invoice"
            onChange={(next) => set("supplier", next)}
          />
          <Field
            id="supplierTaxId"
            label="Supplier tax ID"
            value={value.supplierTaxId ?? ""}
            disabled={disabled}
            placeholder="VAT / GST number"
            hint="Leave empty if the invoice does not show one."
            onChange={(next) =>
              set("supplierTaxId", next.trim() === "" ? null : next)
            }
          />
          <Field
            id="invoiceNumber"
            label="Invoice number"
            value={value.invoiceNumber}
            disabled={disabled}
            onChange={(next) => set("invoiceNumber", next)}
          />
          <Field
            id="currency"
            label="Currency"
            value={value.currency}
            disabled={disabled}
            placeholder="USD"
            hint="Three-letter ISO code."
            onChange={(next) => set("currency", next.toUpperCase().slice(0, 3))}
          />
          <Field
            id="issueDate"
            label="Issue date"
            type="date"
            value={value.issueDate}
            disabled={disabled}
            onChange={(next) => set("issueDate", next)}
          />
          <Field
            id="dueDate"
            label="Due date"
            type="date"
            value={value.dueDate ?? ""}
            disabled={disabled}
            onChange={(next) => set("dueDate", next === "" ? null : next)}
          />
        </div>

        <LineItemsTable
          lineItems={value.lineItems}
          onChange={setLineItems}
          currency={value.currency}
          statedSubtotal={value.subtotal}
          disabled={disabled}
        />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Totals</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldShell htmlFor="subtotal" label="Subtotal">
              <NumberInput
                id="subtotal"
                value={value.subtotal}
                disabled={disabled}
                onChange={(next) => set("subtotal", next)}
                className={numericFieldClasses}
              />
            </FieldShell>
            <FieldShell htmlFor="tax" label="Tax">
              <NumberInput
                id="tax"
                value={value.tax}
                disabled={disabled}
                onChange={(next) => set("tax", next)}
                className={numericFieldClasses}
              />
            </FieldShell>
            <FieldShell
              htmlFor="total"
              label="Total"
              error={
                totalMatches
                  ? undefined
                  : `Subtotal plus tax is ${formatMoney(computedTotal, value.currency)}.`
              }
            >
              <NumberInput
                id="total"
                value={value.total}
                disabled={disabled}
                onChange={(next) => set("total", next)}
                className={[
                  numericFieldClasses,
                  "font-semibold",
                  totalMatches ? "" : "border-warn focus:border-warn",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </FieldShell>
          </div>
        </div>
      </div>
    </section>
  );
}
