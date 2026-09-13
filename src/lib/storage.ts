import type { ProcessedInvoice } from "@/types/invoice";

/**
 * Everything the app remembers lives in this browser's localStorage. There is no
 * server-side database and no account. Every function here is a no-op during
 * server rendering so pages can be rendered on the server without blowing up.
 */
const INVOICES_KEY = "invoice-keeper:invoices";
const WEBHOOK_KEY = "invoice-keeper:webhook-url";

/** Fired after any write so open views can refresh themselves. */
export const STORAGE_EVENT = "invoice-keeper:changed";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function announceChange(): void {
  if (!hasWindow()) return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Guards against hand-edited or half-written localStorage entries. */
function isProcessedInvoice(value: unknown): value is ProcessedInvoice {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.fileName === "string" &&
    isRecord(value.extracted) &&
    Array.isArray(value.findings) &&
    (value.status === "draft" || value.status === "sent")
  );
}

const EMPTY_INVOICES: ProcessedInvoice[] = [];

/**
 * Parsed invoices, memoised against the raw stored string. useSyncExternalStore
 * compares snapshots by identity, so re-parsing on every read would loop.
 */
let cachedRaw: string | null = null;
let cachedInvoices: ProcessedInvoice[] = EMPTY_INVOICES;

export function getInvoices(): ProcessedInvoice[] {
  if (!hasWindow()) return EMPTY_INVOICES;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(INVOICES_KEY);
  } catch {
    return EMPTY_INVOICES;
  }

  if (raw === cachedRaw) return cachedInvoices;
  cachedRaw = raw;

  if (!raw) {
    cachedInvoices = EMPTY_INVOICES;
    return cachedInvoices;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    cachedInvoices = Array.isArray(parsed)
      ? parsed.filter(isProcessedInvoice)
      : EMPTY_INVOICES;
  } catch {
    cachedInvoices = EMPTY_INVOICES;
  }
  return cachedInvoices;
}

/** Server render has no storage: always the same empty array. */
export function getInvoicesServerSnapshot(): ProcessedInvoice[] {
  return EMPTY_INVOICES;
}

/** Subscribes to writes from this tab and from other tabs. */
export function subscribeToStorage(listener: () => void): () => void {
  if (!hasWindow()) return () => {};
  window.addEventListener(STORAGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(STORAGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function getInvoice(id: string): ProcessedInvoice | null {
  return getInvoices().find((invoice) => invoice.id === id) ?? null;
}

function writeInvoices(invoices: ProcessedInvoice[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    announceChange();
  } catch {
    // Storage full or blocked (private browsing). The in-memory UI still works.
  }
}

/** Adds a new invoice, newest first. */
export function saveInvoice(invoice: ProcessedInvoice): void {
  writeInvoices([invoice, ...getInvoices()]);
}

/** Merges changes into an existing invoice. Does nothing if the id is unknown. */
export function updateInvoice(
  id: string,
  changes: Partial<Omit<ProcessedInvoice, "id">>,
): void {
  const invoices = getInvoices();
  const index = invoices.findIndex((invoice) => invoice.id === id);
  if (index === -1) return;
  invoices[index] = { ...invoices[index], ...changes };
  writeInvoices(invoices);
}

export function deleteInvoice(id: string): void {
  writeInvoices(getInvoices().filter((invoice) => invoice.id !== id));
}

export function clearInvoices(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(INVOICES_KEY);
    announceChange();
  } catch {
    // Ignore: nothing else to do if storage is unavailable.
  }
}

export function getWebhookUrl(): string {
  if (!hasWindow()) return "";
  try {
    return window.localStorage.getItem(WEBHOOK_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setWebhookUrl(url: string): void {
  if (!hasWindow()) return;
  try {
    const trimmed = url.trim();
    if (trimmed === "") {
      window.localStorage.removeItem(WEBHOOK_KEY);
    } else {
      window.localStorage.setItem(WEBHOOK_KEY, trimmed);
    }
    announceChange();
  } catch {
    // Ignore: the settings page reports the failure to save via its own state.
  }
}

/** Removes every trace of the app from this browser. */
export function clearAllData(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(INVOICES_KEY);
    window.localStorage.removeItem(WEBHOOK_KEY);
    announceChange();
  } catch {
    // Ignore.
  }
}

export function newInvoiceId(): string {
  if (hasWindow() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
