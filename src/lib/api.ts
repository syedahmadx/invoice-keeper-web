import { ProviderError, statusForProviderError } from "@/lib/providers/errors";

/** The error body every route handler returns, and the only thing the UI reads. */
export type ApiErrorBody = {
  error: string;
  kind: string;
};

export function errorResponse(
  message: string,
  status: number,
  kind = "request",
): Response {
  const body: ApiErrorBody = { error: message, kind };
  return Response.json(body, { status });
}

/** Turns a thrown provider error into the matching HTTP status. */
export function providerErrorResponse(error: unknown): Response {
  if (error instanceof ProviderError) {
    return errorResponse(
      error.message,
      statusForProviderError(error),
      error.kind,
    );
  }
  const message =
    error instanceof Error ? error.message : "Unexpected server error.";
  return errorResponse(message, 500, "unknown");
}

/** Reads a JSON body, returning null rather than throwing on malformed input. */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Strips a `data:` URL prefix, if the client sent the whole data URL. */
export function stripDataUrlPrefix(base64: string): string {
  const comma = base64.indexOf(",");
  return base64.startsWith("data:") && comma !== -1
    ? base64.slice(comma + 1)
    : base64;
}

/** Decoded byte length of a base64 string, without allocating the buffer. */
export function base64ByteLength(base64: string): number {
  const clean = base64.replace(/\s/g, "");
  if (clean.length === 0) return 0;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

export function isLikelyBase64(value: string): boolean {
  return /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(value);
}

export function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === "string" && key.trim() !== "";
}
