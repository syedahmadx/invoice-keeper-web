/**
 * Provider wiring lives here and nowhere else.
 *
 * `extractInvoice` and `reviewInvoice` are two independent steps, so they can be
 * served by two different providers. To add a second provider, drop a module
 * alongside `gemini.ts` exporting the same function shape (for example
 * `anthropic.ts` exporting `reviewInvoice`), change REVIEW_PROVIDER below, and
 * update the single import in `src/lib/providers/index.ts`. No other file in the
 * app names a provider.
 */
export const EXTRACTION_PROVIDER = "Gemini";
export const REVIEW_PROVIDER = "Gemini";

export const GEMINI_MODEL = "gemini-2.5-flash";

/** Upstream model calls are abandoned after this many milliseconds. */
export const PROVIDER_TIMEOUT_MS = 30_000;
