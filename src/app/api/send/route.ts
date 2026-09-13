import { errorResponse, readJsonBody } from "@/lib/api";
import { isValidWebhookUrl } from "@/lib/validation";

/**
 * POST /api/send
 *
 * Body: { webhookUrl: string, payload: unknown }
 *
 * Forwards the confirmed invoice to the user's own webhook. This runs on the
 * server because arbitrary webhook endpoints do not send CORS headers, so the
 * browser could not post to them directly.
 */
const WEBHOOK_TIMEOUT_MS = 15_000;

/** Enough of the response to be useful in the UI, not enough to be a payload. */
const MAX_ECHOED_BODY_CHARS = 2000;

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const { webhookUrl, payload } = body;

  if (typeof webhookUrl !== "string" || !isValidWebhookUrl(webhookUrl)) {
    return errorResponse(
      "webhookUrl must be a well-formed https:// URL.",
      400,
      "invalid_webhook",
    );
  }

  if (payload === undefined) {
    return errorResponse("payload is required.", 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "InvoiceKeeper/1.0",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "follow",
    });

    const text = await response.text().catch(() => "");

    return Response.json({
      ok: response.ok,
      status: response.status,
      body: text.slice(0, MAX_ECHOED_BODY_CHARS),
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      return errorResponse(
        `The webhook did not respond within ${WEBHOOK_TIMEOUT_MS / 1000} seconds.`,
        504,
        "timeout",
      );
    }
    const detail =
      cause instanceof Error ? cause.message : "unknown network error";
    return errorResponse(
      `Could not reach the webhook: ${detail}`,
      502,
      "upstream",
    );
  } finally {
    clearTimeout(timer);
  }
}
