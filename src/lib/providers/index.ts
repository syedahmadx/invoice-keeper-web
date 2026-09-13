/**
 * The single import point for provider functions. Swapping a provider means
 * changing the two lines below and the matching constant in `config.ts`.
 */
export { extractInvoice, reviewInvoice } from "./gemini";
export type { ExtractionResult, ReviewResult } from "./gemini";
export { ProviderError, statusForProviderError } from "./errors";
export type { ProviderErrorKind } from "./errors";
