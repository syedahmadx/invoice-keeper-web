import {
  base64ByteLength,
  errorResponse,
  isApiKeyConfigured,
  isLikelyBase64,
  providerErrorResponse,
  readJsonBody,
  stripDataUrlPrefix,
} from "@/lib/api";
import { extractInvoice } from "@/lib/providers";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
  isAcceptedMimeType,
} from "@/lib/validation";

/**
 * POST /api/extract
 *
 * Body: { fileBase64: string, mimeType: string, fileName?: string }
 *
 * The browser never talks to the model directly: the API key stays in this
 * process. The companion Android app posts to this same endpoint.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isApiKeyConfigured()) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart.",
      401,
      "missing_key",
    );
  }

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const { fileBase64, mimeType } = body;

  if (typeof fileBase64 !== "string" || fileBase64.trim() === "") {
    return errorResponse("fileBase64 is required.", 400);
  }

  if (!isAcceptedMimeType(mimeType)) {
    return errorResponse(
      `mimeType must be one of: ${ACCEPTED_MIME_TYPES.join(", ")}.`,
      400,
    );
  }

  const payload = stripDataUrlPrefix(fileBase64).trim();
  if (!isLikelyBase64(payload)) {
    return errorResponse("fileBase64 is not valid base64 data.", 400);
  }

  const byteLength = base64ByteLength(payload);
  if (byteLength === 0) {
    return errorResponse("The uploaded file is empty.", 400);
  }
  if (byteLength > MAX_FILE_BYTES) {
    return errorResponse(`File must be under ${MAX_FILE_LABEL}.`, 400);
  }

  try {
    const result = await extractInvoice(payload, mimeType);
    return Response.json(result);
  } catch (error) {
    return providerErrorResponse(error);
  }
}
