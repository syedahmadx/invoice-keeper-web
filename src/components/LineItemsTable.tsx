"use client";

import type { InvoiceLineItem } from "@/types/invoice";
import { formatMoney, roundMoney, sumLineItems } from "@/lib/format";
import { Button } from "./Button";
import { NumberInput } from "./NumberInput";

type LineItemsTableProps = {
  lineItems: InvoiceLineItem[];
  onChange: (lineItems: InvoiceLineItem[]) => void;
  currency: string;
  /** Shown beside the running total so mismatches are visible while editing. */
  statedSubtotal: number;
  disabled?: boolean;
};

const EMPTY_ROW: InvoiceLineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  amount: 0,
};

const cellInputClasses =
  "w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-sm text-ink " +
  "transition-colors hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none " +
  "disabled:cursor-not-allowed disabled:text-ink-muted";

const numericCellClasses = `${cellInputClasses} text-right numeric`;

export function LineItemsTable({
  lineItems,
  onChange,
  currency,
  statedSubtotal,
  disabled = false,
}: LineItemsTableProps) {
  const runningTotal = sumLineItems(lineItems);
  const drift = roundMoney(runningTotal - statedSubtotal);
  const matchesSubtotal = Math.abs(drift) < 0.005;

  function updateRow(index: number, changes: Partial<InvoiceLineItem>) {
    const next = lineItems.map((item, i) => {
      if (i !== index) return item;
      const merged = { ...item, ...changes };
      // Recompute the amount when the inputs to it change, unless the user is
      // editing the amount directly.
      if (changes.amount === undefined) {
        merged.amount = roundMoney(merged.quantity * merged.unitPrice);
      }
      return merged;
    });
    onChange(next);
  }

  function addRow() {
    onChange([...lineItems, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    onChange(lineItems.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Line items</h3>
        <Button size="sm" variant="secondary" onClick={addRow} disabled={disabled}>
          Add row
        </Button>
      </div>

      {lineItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface px-4 py-8 text-center text-sm text-ink-muted">
          No line items were read from this invoice. Add a row to enter them by
          hand.
        </p>
      ) : (
        <>
          {/* Wide layout: a real table, right-aligned figures in tabular numerals. */}
          <div className="hidden overflow-hidden rounded-lg border border-line bg-surface md:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken text-left">
                  <th
                    scope="col"
                    className="w-[46%] px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="w-[13%] px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted"
                  >
                    Qty
                  </th>
                  <th
                    scope="col"
                    className="w-[17%] px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted"
                  >
                    Unit price
                  </th>
                  <th
                    scope="col"
                    className="w-[17%] px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted"
                  >
                    Amount
                  </th>
                  <th scope="col" className="w-[7%] px-1 py-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-1.5 py-1">
                      <input
                        type="text"
                        value={item.description}
                        disabled={disabled}
                        aria-label={`Description, row ${index + 1}`}
                        placeholder="Description"
                        onChange={(event) =>
                          updateRow(index, { description: event.target.value })
                        }
                        className={cellInputClasses}
                      />
                    </td>
                    <td className="px-1.5 py-1">
                      <NumberInput
                        value={item.quantity}
                        disabled={disabled}
                        aria-label={`Quantity, row ${index + 1}`}
                        onChange={(quantity) => updateRow(index, { quantity })}
                        className={numericCellClasses}
                      />
                    </td>
                    <td className="px-1.5 py-1">
                      <NumberInput
                        value={item.unitPrice}
                        disabled={disabled}
                        aria-label={`Unit price, row ${index + 1}`}
                        onChange={(unitPrice) => updateRow(index, { unitPrice })}
                        className={numericCellClasses}
                      />
                    </td>
                    <td className="px-1.5 py-1">
                      <NumberInput
                        value={item.amount}
                        disabled={disabled}
                        aria-label={`Amount, row ${index + 1}`}
                        onChange={(amount) => updateRow(index, { amount })}
                        className={`${numericCellClasses} font-medium`}
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={disabled}
                        aria-label={`Remove row ${index + 1}`}
                        className="rounded p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 3l8 8M11 3l-8 8"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Narrow layout: one card per row. A 5-column table cannot stay
              legible at 375px, and horizontal scrolling hides the amounts. */}
          <ul className="space-y-2 md:hidden">
            {lineItems.map((item, index) => (
              <li
                key={index}
                className="space-y-2.5 rounded-lg border border-line bg-surface p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-2 w-5 shrink-0 text-xs text-ink-faint numeric">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={item.description}
                    disabled={disabled}
                    aria-label={`Description, row ${index + 1}`}
                    placeholder="Description"
                    onChange={(event) =>
                      updateRow(index, { description: event.target.value })
                    }
                    className={`${cellInputClasses} border-line-strong bg-surface`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={disabled}
                    aria-label={`Remove row ${index + 1}`}
                    className="mt-0.5 shrink-0 rounded p-2 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 3l8 8M11 3l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pl-7">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-ink-muted">
                      Qty
                    </span>
                    <NumberInput
                      value={item.quantity}
                      disabled={disabled}
                      onChange={(quantity) => updateRow(index, { quantity })}
                      className={`${numericCellClasses} border-line-strong`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-ink-muted">
                      Unit
                    </span>
                    <NumberInput
                      value={item.unitPrice}
                      disabled={disabled}
                      onChange={(unitPrice) => updateRow(index, { unitPrice })}
                      className={`${numericCellClasses} border-line-strong`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-ink-muted">
                      Amount
                    </span>
                    <NumberInput
                      value={item.amount}
                      disabled={disabled}
                      onChange={(amount) => updateRow(index, { amount })}
                      className={`${numericCellClasses} border-line-strong font-medium`}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Live sum of the rows above, checked against the invoice's own subtotal. */}
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-3.5 py-3 text-sm",
          matchesSubtotal
            ? "border-line bg-sunken"
            : "border-warn-line bg-warn-soft",
        ].join(" ")}
      >
        <span className="text-ink-muted">Line items total</span>
        <span className="font-semibold text-ink numeric">
          {formatMoney(runningTotal, currency)}
        </span>
        {matchesSubtotal ? null : (
          <p className="w-full text-xs text-warn">
            This is {formatMoney(Math.abs(drift), currency)}{" "}
            {drift > 0 ? "more" : "less"} than the subtotal below (
            {formatMoney(statedSubtotal, currency)}).
          </p>
        )}
      </div>
    </div>
  );
}
