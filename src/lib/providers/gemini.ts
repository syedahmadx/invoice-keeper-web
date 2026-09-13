/**
 * Gemini provider. SERVER ONLY — this module reads GEMINI_API_KEY and must only
 * ever be imported from route handlers under src/app/api. It is never imported
 * by a client component, so the key is never part of a browser bundle.
 */
import {
  EXTRACTION_PROVIDER,
  GEMINI_MODEL,
  PROVIDER_TIMEOUT_MS,
  REVIEW_PROVIDER,
} from "./config";
import { ProviderError } from "./errors";
import type {
  ExtractedInvoice,
  FindingSeverity,
  InvoiceLineItem,
  ReviewFinding,
} from "@/types/invoice";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

export type ExtractionResult = {
  provider: string;
  data: ExtractedInvoice;
};

export type ReviewResult = {
  provider: string;
  findings: ReviewFinding[];
};

function requireApiKey(provider: string): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "") {
    throw new ProviderError(
      "missing_key",
      "GEMINI_API_KEY is not configured on the server.",
      provider,
    );
  }
  return key.trim();
}

/** POST to Gemini and return the raw text of the first candidate. */
async function generateContent(
  parts: GeminiPart[],
  provider: string,
): Promise<string> {
  const apiKey = requireApiKey(provider);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
      signal: controller.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new ProviderError(
        "timeout",
        `${provider} did not respond within ${PROVIDER_TIMEOUT_MS / 1000} seconds.`,
        provider,
      );
    }
    const detail =
      cause instanceof Error ? cause.message : "unknown network error";
    throw new ProviderError(
      "upstream",
      `Could not reach ${provider}: ${detail}`,
      provider,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new ProviderError(
        "rate_limit",
        `${provider} rate limit reached. Wait a moment and try again.`,
        provider,
        429,
      );
    }
    const detail = await readErrorMessage(response);
    throw new ProviderError(
      "upstream",
      `${provider} returned ${response.status}${detail ? `: ${detail}` : ""}`,
      provider,
      response.status,
    );
  }

  let payload: GeminiResponse;
  try {
    payload = (await response.json()) as GeminiResponse;
  } catch {
    throw new ProviderError(
      "invalid_response",
      `${provider} returned a response that was not JSON.`,
      provider,
      response.status,
    );
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new ProviderError(
      "invalid_response",
      `${provider} returned an empty response.`,
      provider,
      response.status,
    );
  }
  return text;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as GeminiResponse;
    return body.error?.message ?? "";
  } catch {
    return "";
  }
}

/** Models sometimes wrap JSON in markdown fences despite being told not to. */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function parseJson(raw: string): unknown {
  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: pull the outermost object or array out of surrounding prose.
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts numbers, or numeric strings such as "1.234,56" and "$1,234.56". */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  let cleaned = value.replace(/[^\d.,-]/g, "").trim();
  if (cleaned === "") return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > lastDot) {
    // Comma is the decimal separator, e.g. 1.234,56
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toNullableText(value: unknown): string | null {
  const text = toText(value);
  return text === "" ? null : text;
}

function toLineItems(value: unknown): InvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((row) => {
    const quantity = toNumber(row.quantity);
    const unitPrice = toNumber(row.unitPrice ?? row.unit_price ?? row.price);
    const rawAmount = row.amount ?? row.total ?? row.lineTotal;
    const amount =
      rawAmount === undefined || rawAmount === null
        ? Number((quantity * unitPrice).toFixed(2))
        : toNumber(rawAmount);
    return {
      description: toText(row.description ?? row.item ?? row.name),
      quantity,
      unitPrice,
      amount,
    };
  });
}

function toExtractedInvoice(value: unknown): ExtractedInvoice {
  const source = isRecord(value) ? value : {};
  return {
    supplier: toText(source.supplier ?? source.vendor),
    supplierTaxId: toNullableText(
      source.supplierTaxId ?? source.supplier_tax_id,
    ),
    invoiceNumber: toText(source.invoiceNumber ?? source.invoice_number),
    issueDate: toText(source.issueDate ?? source.issue_date ?? source.date),
    dueDate: toNullableText(source.dueDate ?? source.due_date),
    currency: toText(source.currency).toUpperCase() || "USD",
    lineItems: toLineItems(source.lineItems ?? source.line_items),
    subtotal: toNumber(source.subtotal),
    tax: toNumber(source.tax ?? source.taxAmount ?? source.vat),
    total: toNumber(source.total ?? source.grandTotal ?? source.amountDue),
  };
}

const SEVERITIES: FindingSeverity[] = ["error", "warning", "info"];

function toFindings(value: unknown): ReviewFinding[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.findings)
      ? value.findings
      : [];

  return rows.filter(isRecord).flatMap((row) => {
    const message = toText(row.message);
    if (message === "") return [];
    const rawSeverity = toText(row.severity).toLowerCase() as FindingSeverity;
    return [
      {
        severity: SEVERITIES.includes(rawSeverity) ? rawSeverity : "info",
        field: toText(row.field) || "general",
        message,
      },
    ];
  });
}

const EXTRACTION_PROMPT = `You are an invoice data extractor for an accounts-payable tool.

Read the attached supplier invoice and return ONLY a JSON object, with no prose and no markdown fences, in exactly this shape:

{
  "supplier": string,
  "supplierTaxId": string | null,
  "invoiceNumber": string,
  "issueDate": string,
  "dueDate": string | null,
  "currency": string,
  "lineItems": [{ "description": string, "quantity": number, "unitPrice": number, "amount": number }],
  "subtotal": number,
  "tax": number,
  "total": number
}

Rules:
- Dates must be ISO 8601 calendar dates (YYYY-MM-DD). If a date is absent use null for dueDate and an empty string for issueDate.
- currency must be a 3-letter ISO 4217 code such as USD, EUR or GBP. Infer it from the symbol if it is not spelled out.
- All money and quantity values must be plain JSON numbers: no currency symbols, no thousands separators, a dot for the decimal point.
- supplierTaxId is the supplier's VAT/GST/tax registration number, or null if the invoice does not show one.
- Transcribe what the document actually says. Do not calculate missing totals, do not correct arithmetic, and never invent a value. Use an empty string or null when something is genuinely not present.`;

const REVIEW_PROMPT = `You are a meticulous accounts-payable reviewer. You are given invoice data that another model extracted from a scanned document. Find the problems a bookkeeper would care about.

Check every one of these:
- Do the line item amounts add up to the stated subtotal?
- Does subtotal + tax equal the stated total?
- Is the supplier tax id missing?
- Is the issue date in the future?
- Is the due date before the issue date?
- Is the invoice number missing or empty?
- Is the total implausible: zero, negative, or wildly out of step with the line items?

Return ONLY a JSON array, with no prose and no markdown fences, in exactly this shape:

[{ "severity": "error" | "warning" | "info", "field": string, "message": string }]

Rules:
- "error" means the data is internally inconsistent or unusable as it stands; "warning" means it is suspicious or incomplete; "info" is a note worth a glance.
- "field" names the field the finding is about, such as "total", "subtotal", "dueDate", "supplierTaxId" or "lineItems".
- "message" is one short sentence in plain language. Quote the actual numbers when arithmetic does not match.
- Return an empty array if everything checks out. Do not invent problems.`;

/** Send the invoice file to the model and return the structured fields it read. */
export async function extractInvoice(
  fileBase64: string,
  mimeType: string,
): Promise<ExtractionResult> {
  const raw = await generateContent(
    [
      { text: EXTRACTION_PROMPT },
      { inline_data: { mime_type: mimeType, data: fileBase64 } },
    ],
    EXTRACTION_PROVIDER,
  );

  const parsed = parseJson(raw);
  if (parsed === null) {
    throw new ProviderError(
      "invalid_response",
      `${EXTRACTION_PROVIDER} did not return readable JSON for this file.`,
      EXTRACTION_PROVIDER,
    );
  }

  return { provider: EXTRACTION_PROVIDER, data: toExtractedInvoice(parsed) };
}

/**
 * Second pass: hand the extracted fields back to a model and ask what looks wrong.
 * A review that cannot be parsed yields no findings rather than failing the whole
 * request — the user can still correct and send the invoice without it.
 */
export async function reviewInvoice(
  extracted: ExtractedInvoice,
): Promise<ReviewResult> {
  const today = new Date().toISOString().slice(0, 10);
  const raw = await generateContent(
    [
      { text: REVIEW_PROMPT },
      { text: `Today's date is ${today}.` },
      { text: `Invoice data to review:\n${JSON.stringify(extracted, null, 2)}` },
    ],
    REVIEW_PROVIDER,
  );

  const parsed = parseJson(raw);
  return { provider: REVIEW_PROVIDER, findings: toFindings(parsed) };
}
