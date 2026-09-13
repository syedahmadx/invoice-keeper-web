import type { ExtractedInvoice } from "@/types/invoice";

/** File types the extraction provider can read. */
export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

/** Accept attribute for the file input, matching ACCEPTED_MIME_TYPES. */
export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_FILE_LABEL = "8 MB";

export function isAcceptedMimeType(value: unknown): value is AcceptedMimeType {
  return (
    typeof value === "string" &&
    (ACCEPTED_MIME_TYPES as readonly string[]).includes(value)
  );
}

/** Webhooks must be https so the payload is not sent in the clear. */
export function isValidWebhookUrl(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "https:" && parsed.hostname !== "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural check used by /api/review before spending a model call on a payload
 * that is not an invoice.
 */
export function isExtractedInvoice(value: unknown): value is ExtractedInvoice {
  if (!isRecord(value)) return false;

  const stringFields = ["supplier", "invoiceNumber", "issueDate", "currency"];
  if (stringFields.some((field) => typeof value[field] !== "string")) {
    return false;
  }

  const nullableFields = ["supplierTaxId", "dueDate"];
  if (
    nullableFields.some(
      (field) => value[field] !== null && typeof value[field] !== "string",
    )
  ) {
    return false;
  }

  const numberFields = ["subtotal", "tax", "total"];
  if (
    numberFields.some(
      (field) =>
        typeof value[field] !== "number" ||
        !Number.isFinite(value[field] as number),
    )
  ) {
    return false;
  }

  if (!Array.isArray(value.lineItems)) return false;

  return value.lineItems.every(
    (item) =>
      isRecord(item) &&
      typeof item.description === "string" &&
      typeof item.quantity === "number" &&
      typeof item.unitPrice === "number" &&
      typeof item.amount === "number",
  );
}
