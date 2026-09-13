"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Field } from "@/components/Field";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { postJson, type SendResponse } from "@/lib/client";
import { useInvoices, useWebhookUrl } from "@/lib/hooks";
import { clearAllData, setWebhookUrl as persistWebhookUrl } from "@/lib/storage";
import { isValidWebhookUrl } from "@/lib/validation";

type ConfigResponse = {
  apiKeyConfigured: boolean;
  extractionProvider: string;
  reviewProvider: string;
};

type TestResult =
  | { kind: "ok"; status: number; body: string }
  | { kind: "failed"; message: string };

export default function SettingsPage() {
  const savedUrl = useWebhookUrl();
  const invoiceCount = useInvoices().length;

  /** null means "showing the saved value"; a string is an unsaved edit. */
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const url = draftUrl ?? savedUrl;
  const [urlError, setUrlError] = useState("");
  const [saveConfirmed, setSaveConfirmed] = useState(false);

  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [configError, setConfigError] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const testInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    fetch("/api/config")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status}).`);
        return response.json() as Promise<ConfigResponse>;
      })
      .then((data) => {
        if (active) setConfig(data);
      })
      .catch(() => {
        if (active) setConfigError("Could not check the server configuration.");
      });

    return () => {
      active = false;
    };
  }, []);

  function save() {
    const trimmed = url.trim();

    if (trimmed === "") {
      persistWebhookUrl("");
      setDraftUrl(null);
      setUrlError("");
      setSaveConfirmed(true);
      setTestResult(null);
      return;
    }

    if (!isValidWebhookUrl(trimmed)) {
      setUrlError(
        "Enter a complete https:// URL, for example https://hook.example.com/invoices.",
      );
      setSaveConfirmed(false);
      return;
    }

    persistWebhookUrl(trimmed);
    setDraftUrl(null);
    setUrlError("");
    setSaveConfirmed(true);
    setTestResult(null);
  }

  async function sendTest() {
    if (testInFlight.current || savedUrl === "") return;
    testInFlight.current = true;
    setTesting(true);
    setTestResult(null);

    try {
      const result = await postJson<SendResponse>("/api/send", {
        webhookUrl: savedUrl,
        payload: {
          source: "invoice-keeper",
          test: true,
          sentAt: new Date().toISOString(),
          invoice: {
            supplier: "Test Supplier Ltd",
            supplierTaxId: "GB123456789",
            invoiceNumber: "TEST-0001",
            issueDate: new Date().toISOString().slice(0, 10),
            dueDate: null,
            currency: "USD",
            lineItems: [
              {
                description: "Sample line item",
                quantity: 1,
                unitPrice: 100,
                amount: 100,
              },
            ],
            subtotal: 100,
            tax: 20,
            total: 120,
          },
          findings: [],
        },
      });

      setTestResult(
        result.ok
          ? { kind: "ok", status: result.status, body: result.body }
          : {
              kind: "failed",
              message: `The webhook replied with ${result.status}. ${
                result.body ? result.body.slice(0, 300) : "No response body."
              }`,
            },
      );
    } catch (error) {
      setTestResult({
        kind: "failed",
        message: error instanceof Error ? error.message : "The test failed.",
      });
    } finally {
      testInFlight.current = false;
      setTesting(false);
    }
  }

  function clearEverything() {
    clearAllData();
    setDraftUrl(null);
    setConfirmingClear(false);
    setTestResult(null);
    setSaveConfirmed(false);
    setCleared(true);
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Settings
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Where confirmed invoices are sent, and what this app knows about you.
        </p>
      </header>

      {/* Webhook */}
      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">Webhook</h2>
          <p className="text-sm text-ink-muted">
            Confirmed invoices are posted here as JSON. Point it at your
            accounting integration, a Make.com or Zapier hook, or any endpoint
            that accepts a POST. It must be https.
          </p>
        </div>

        <Field
          id="webhookUrl"
          label="Webhook URL"
          type="url"
          value={url}
          error={urlError || undefined}
          placeholder="https://hook.example.com/invoices"
          hint="Leave empty to turn sending off."
          onChange={(next) => {
            setDraftUrl(next);
            setUrlError("");
            setSaveConfirmed(false);
            setCleared(false);
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={save} disabled={url === savedUrl}>
            Save
          </Button>
          <Button
            variant="secondary"
            loading={testing}
            disabled={savedUrl === "" || testing}
            onClick={() => void sendTest()}
          >
            Send a test payload
          </Button>
          {saveConfirmed ? (
            <span className="text-sm text-ok">
              {savedUrl === "" ? "Webhook cleared." : "Webhook saved."}
            </span>
          ) : null}
          {url !== savedUrl && url.trim() !== "" ? (
            <span className="text-sm text-ink-faint">Unsaved change</span>
          ) : null}
        </div>

        {savedUrl === "" ? null : (
          <p className="text-xs text-ink-faint">
            The test posts one sample invoice so you can confirm the endpoint
            receives it.
          </p>
        )}

        {testing ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <LoadingSpinner size={13} /> Posting the test payload…
          </p>
        ) : null}

        {testResult?.kind === "ok" ? (
          <div className="rounded-lg border border-ok-line bg-ok-soft p-3.5">
            <p className="text-sm font-medium text-ok">
              Webhook responded {testResult.status}
            </p>
            {testResult.body ? (
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-ink-muted">
                {testResult.body}
              </pre>
            ) : null}
          </div>
        ) : null}

        {testResult?.kind === "failed" ? (
          <ErrorBanner
            title="Test failed"
            message={testResult.message}
            onRetry={() => void sendTest()}
            onDismiss={() => setTestResult(null)}
          />
        ) : null}
      </section>

      {/* Server-side key */}
      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">AI provider</h2>
          <p className="text-sm text-ink-muted">
            The API key is read from <code className="font-mono text-xs">.env.local</code>{" "}
            on the server. It is never sent to the browser — this page only asks
            whether one is present.
          </p>
        </div>

        {configError ? (
          <p className="text-sm text-danger">{configError}</p>
        ) : config === null ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <LoadingSpinner size={13} /> Checking…
          </p>
        ) : (
          <div className="space-y-3">
            <div
              className={[
                "flex items-start gap-2.5 rounded-lg border p-3.5",
                config.apiKeyConfigured
                  ? "border-ok-line bg-ok-soft"
                  : "border-warn-line bg-warn-soft",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  config.apiKeyConfigured ? "bg-ok" : "bg-warn",
                ].join(" ")}
              />
              <div>
                <p
                  className={[
                    "text-sm font-medium",
                    config.apiKeyConfigured ? "text-ok" : "text-warn",
                  ].join(" ")}
                >
                  {config.apiKeyConfigured
                    ? "API key configured on the server"
                    : "No API key configured"}
                </p>
                {config.apiKeyConfigured ? null : (
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Add <code className="font-mono text-xs">GEMINI_API_KEY</code>{" "}
                    to <code className="font-mono text-xs">.env.local</code> and
                    restart the server. Extraction and review will fail until you
                    do.
                  </p>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Extraction
                </dt>
                <dd className="mt-1 text-ink">{config.extractionProvider}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Review
                </dt>
                <dd className="mt-1 text-ink">{config.reviewProvider}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {/* Data statement */}
      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Your data</h2>

        <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
          <div>
            <h3 className="font-medium text-ink">
              What is sent to the AI provider
            </h3>
            <p className="mt-1">
              When you press Extract, the invoice file itself is sent to{" "}
              {config?.extractionProvider ?? "the extraction provider"} through
              this app&rsquo;s server. When you press Review, the extracted
              fields — supplier, tax ID, dates, line items and totals — are sent
              to {config?.reviewProvider ?? "the review provider"} as text.
              Nothing else about you is included, and the app keeps no copy on
              the server.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-ink">What is stored on this device</h3>
            <p className="mt-1">
              Saved invoices and this webhook URL are held in this
              browser&rsquo;s local storage. There is no database and no account.
              Another browser, another device, or a private window will not see
              them, and clearing your browser data deletes them.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-ink">Where the confirmed data goes</h3>
            <p className="mt-1">
              Only when you press Send. The invoice JSON is posted to the webhook
              URL above, through this app&rsquo;s server so the browser is not
              blocked by CORS.
            </p>
          </div>
        </div>
      </section>

      {/* Destructive */}
      <section className="space-y-4 rounded-xl border border-danger-line bg-surface p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">Clear all local data</h2>
          <p className="text-sm text-ink-muted">
            Deletes every saved invoice and the webhook URL from this browser.
            This cannot be undone.
          </p>
        </div>

        <p className="text-sm text-ink-muted numeric">
          {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"} stored
        </p>

        {confirmingClear ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-danger-line bg-danger-soft p-3.5">
            <p className="text-sm text-ink">
              Delete {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"}{" "}
              and the webhook URL?
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onClick={clearEverything}>
                Yes, delete everything
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              onClick={() => setConfirmingClear(true)}
              disabled={invoiceCount === 0 && savedUrl === ""}
            >
              Clear all local data
            </Button>
            {cleared ? (
              <span className="text-sm text-ok">Local data cleared.</span>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
