/** Why an upstream provider call failed, mapped to an HTTP status by route handlers. */
export type ProviderErrorKind =
  | "missing_key"
  | "timeout"
  | "rate_limit"
  | "upstream"
  | "invalid_response";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly provider: string;
  /** Status returned by the upstream API, when there was one. */
  readonly upstreamStatus: number | null;

  constructor(
    kind: ProviderErrorKind,
    message: string,
    provider: string,
    upstreamStatus: number | null = null,
  ) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.provider = provider;
    this.upstreamStatus = upstreamStatus;
  }
}

const STATUS_BY_KIND: Record<ProviderErrorKind, number> = {
  missing_key: 401,
  timeout: 504,
  rate_limit: 429,
  upstream: 502,
  invalid_response: 502,
};

export function statusForProviderError(error: ProviderError): number {
  return STATUS_BY_KIND[error.kind];
}
