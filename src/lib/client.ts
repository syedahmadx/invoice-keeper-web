import type { ExtractedInvoice, ReviewFinding } from "@/types/invoice";

/** Shapes returned by this app's own API routes. */
export type ExtractResponse = { provider: string; data: ExtractedInvoice };
export type ReviewResponse = { provider: string; findings: ReviewFinding[] };
export type SendResponse = { ok: boolean; status: number; body: string };

/** POSTs JSON and turns any error body into a thrown Error with its message. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? `Request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

/** Reads a File into base64, without the data: URL prefix. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error(`Could not read ${file.name}. Try choosing it again.`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}
