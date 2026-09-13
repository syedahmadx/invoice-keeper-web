import { isApiKeyConfigured } from "@/lib/api";
import { EXTRACTION_PROVIDER, REVIEW_PROVIDER } from "@/lib/providers/config";

/**
 * GET /api/config
 *
 * Reports whether the server has an API key and which providers are wired up.
 * It returns a boolean only — the key itself never leaves this process.
 */
export type ConfigResponse = {
  apiKeyConfigured: boolean;
  extractionProvider: string;
  reviewProvider: string;
};

export async function GET(): Promise<Response> {
  const body: ConfigResponse = {
    apiKeyConfigured: isApiKeyConfigured(),
    extractionProvider: EXTRACTION_PROVIDER,
    reviewProvider: REVIEW_PROVIDER,
  };
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
