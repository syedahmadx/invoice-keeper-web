import {
  errorResponse,
  isApiKeyConfigured,
  providerErrorResponse,
  readJsonBody,
} from "@/lib/api";
import { reviewInvoice } from "@/lib/providers";
import { isExtractedInvoice } from "@/lib/validation";

/**
 * POST /api/review
 *
 * Body: { extracted: ExtractedInvoice }
 *
 * Second pass over data the user may already have corrected by hand, so it takes
 * the current form state rather than re-reading the original file.
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

  if (!isExtractedInvoice(body.extracted)) {
    return errorResponse(
      "extracted must be a complete invoice object with numeric subtotal, tax and total, and a lineItems array.",
      400,
    );
  }

  try {
    const result = await reviewInvoice(body.extracted);
    return Response.json(result);
  } catch (error) {
    return providerErrorResponse(error);
  }
}
