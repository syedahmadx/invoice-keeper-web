"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FileDropZone } from "@/components/FileDropZone";
import { FindingsList } from "@/components/FindingsList";
import { InvoiceForm } from "@/components/InvoiceForm";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  fileToBase64,
  postJson,
  type ExtractResponse,
  type ReviewResponse,
  type SendResponse,
} from "@/lib/client";
import { formatMoney } from "@/lib/format";
import { useWebhookUrl } from "@/lib/hooks";
import { newInvoiceId, saveInvoice } from "@/lib/storage";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
} from "@/lib/validation";
import type {
  ExtractedInvoice,
  ProcessedInvoice,
  ReviewFinding,
} from "@/types/invoice";

/** Every state the workflow can be in. Exactly one is current at any moment. */
type Phase =
  | "idle"
  | "validating"
  | "extracting"
  | "extracted"
  | "reviewing"
  | "reviewed"
  | "sending"
  | "sent"
  | "error";

/** Which step failed, so Retry re-runs the right one. */
type Step = "extract" | "review" | "send";

const BUSY_PHASES: Phase[] = ["validating", "extracting", "reviewing", "sending"];

export default function ScanPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);
  const [extractionProvider, setExtractionProvider] = useState("");

  const [findings, setFindings] = useState<ReviewFinding[] | null>(null);
  const [reviewProvider, setReviewProvider] = useState("");

  const webhookUrl = useWebhookUrl();
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [failedStep, setFailedStep] = useState<Step | null>(null);

  /** Hard guard against a second request slipping past a disabled button. */
  const inFlight = useRef(false);
  const busy = BUSY_PHASES.includes(phase);

  function failWith(step: Step, message: string) {
    setFailedStep(step);
    setErrorMessage(message);
    setPhase("error");
  }

  const runExtract = useCallback(async (source: File) => {
    if (inFlight.current) return;
    inFlight.current = true;

    setErrorMessage("");
    setFailedStep(null);
    setFindings(null);
    setDraftSaved(false);
    setSavedInvoiceId(null);
    setPhase("validating");

    try {
      const fileBase64 = await fileToBase64(source);
      setPhase("extracting");

      const result = await postJson<ExtractResponse>("/api/extract", {
        fileBase64,
        mimeType: source.type,
        fileName: source.name,
      });

      setExtracted(result.data);
      setExtractionProvider(result.provider);
      setPhase("extracted");
    } catch (error) {
      setFailedStep("extract");
      setErrorMessage(
        error instanceof Error ? error.message : "Extraction failed.",
      );
      setPhase("error");
    } finally {
      inFlight.current = false;
    }
  }, []);

  async function runReview() {
    if (inFlight.current || !extracted) return;
    inFlight.current = true;

    setErrorMessage("");
    setFailedStep(null);
    setPhase("reviewing");

    try {
      const result = await postJson<ReviewResponse>("/api/review", {
        extracted,
      });
      setFindings(result.findings);
      setReviewProvider(result.provider);
      setPhase("reviewed");
    } catch (error) {
      failWith("review", error instanceof Error ? error.message : "Review failed.");
    } finally {
      inFlight.current = false;
    }
  }

  async function runSend() {
    if (inFlight.current || !extracted || webhookUrl === "") return;
    inFlight.current = true;

    setErrorMessage("");
    setFailedStep(null);
    setPhase("sending");

    const record: ProcessedInvoice = {
      id: newInvoiceId(),
      createdAt: new Date().toISOString(),
      fileName: file?.name ?? "invoice",
      extracted,
      findings: findings ?? [],
      status: "sent",
      sentAt: new Date().toISOString(),
    };

    try {
      const result = await postJson<SendResponse>("/api/send", {
        webhookUrl,
        payload: {
          source: "invoice-keeper",
          id: record.id,
          fileName: record.fileName,
          sentAt: record.sentAt,
          invoice: record.extracted,
          findings: record.findings,
        },
      });

      if (!result.ok) {
        failWith(
          "send",
          `The webhook replied with ${result.status}. ${
            result.body ? result.body.slice(0, 300) : "No response body."
          }`,
        );
        return;
      }

      saveInvoice(record);
      setSavedInvoiceId(record.id);
      setPhase("sent");
    } catch (error) {
      failWith("send", error instanceof Error ? error.message : "Send failed.");
    } finally {
      inFlight.current = false;
    }
  }

  function saveDraft() {
    if (!extracted || busy) return;
    const record: ProcessedInvoice = {
      id: newInvoiceId(),
      createdAt: new Date().toISOString(),
      fileName: file?.name ?? "invoice",
      extracted,
      findings: findings ?? [],
      status: "draft",
      sentAt: null,
    };
    saveInvoice(record);
    setSavedInvoiceId(record.id);
    setDraftSaved(true);
  }

  function retry() {
    if (failedStep === "extract" && file) {
      void runExtract(file);
    } else if (failedStep === "review") {
      void runReview();
    } else if (failedStep === "send") {
      void runSend();
    }
  }

  function startOver() {
    setPhase("idle");
    setFile(null);
    setFileError(null);
    setExtracted(null);
    setExtractionProvider("");
    setFindings(null);
    setReviewProvider("");
    setErrorMessage("");
    setFailedStep(null);
    setSavedInvoiceId(null);
    setDraftSaved(false);
  }

  function handleFormChange(next: ExtractedInvoice) {
    setExtracted(next);
    setDraftSaved(false);
    // Edits invalidate the review that was run against the previous values.
    if (findings !== null) {
      setFindings(null);
      setPhase("extracted");
    }
  }

  const canSend = extracted !== null && webhookUrl !== "" && !busy;
  /** Once sent, the record is saved; further edits would go nowhere. */
  const locked = busy || phase === "sent";
  const canRetry =
    (failedStep === "extract" && file !== null) ||
    failedStep === "review" ||
    failedStep === "send";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Scan an invoice
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Upload the document, check what was read from it, then send the
          confirmed data to your webhook. Nothing is saved until you choose to
          save or send.
        </p>
      </header>

      <StepRail phase={phase} hasExtract={extracted !== null} hasReview={findings !== null} />

      {phase === "error" && errorMessage ? (
        <ErrorBanner
          title={
            failedStep === "extract"
              ? "Extraction failed"
              : failedStep === "review"
                ? "Review failed"
                : "Could not send"
          }
          message={errorMessage}
          onRetry={canRetry ? retry : undefined}
        />
      ) : null}

      {/* Step 1 — the file */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">1 · Invoice file</h2>
        <FileDropZone
          file={file}
          accepted={ACCEPTED_MIME_TYPES}
          maxBytes={MAX_FILE_BYTES}
          maxLabel={MAX_FILE_LABEL}
          disabled={busy}
          onSelect={(selected) => {
            setFile(selected);
            setFileError(null);
            if (phase === "error" && failedStep === "extract") setPhase("idle");
          }}
          onReject={(reason) => {
            setFile(null);
            setFileError(reason);
          }}
          onClear={() => {
            setFile(null);
            setFileError(null);
          }}
        />
        {fileError ? (
          <p role="alert" className="text-sm text-danger">
            {fileError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            loading={phase === "validating" || phase === "extracting"}
            disabled={!file || busy}
            onClick={() => file && void runExtract(file)}
          >
            {extracted ? "Extract again" : "Extract"}
          </Button>
          {phase === "validating" ? (
            <span className="text-sm text-ink-muted">Reading the file…</span>
          ) : null}
          {phase === "extracting" ? (
            <span className="text-sm text-ink-muted">
              Extracting fields — this usually takes a few seconds.
            </span>
          ) : null}
        </div>
      </section>

      {/* Step 2 — the extracted data */}
      {extracted ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">2 · Check the data</h2>
          <InvoiceForm
            value={extracted}
            onChange={handleFormChange}
            provider={extractionProvider}
            disabled={locked}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              loading={phase === "reviewing"}
              disabled={locked}
              onClick={() => void runReview()}
            >
              {findings === null ? "Review" : "Review again"}
            </Button>
            {phase === "reviewing" ? (
              <span className="text-sm text-ink-muted">
                Checking the numbers…
              </span>
            ) : null}
          </div>

          {findings !== null ? (
            <FindingsList findings={findings} provider={reviewProvider} />
          ) : null}
        </section>
      ) : null}

      {/* Step 3 — send it on */}
      {extracted ? (
        <section className="space-y-4 border-t border-line pt-8">
          <h2 className="text-sm font-semibold text-ink">3 · Send</h2>

          {phase === "sent" ? (
            <div className="flex flex-col gap-3 rounded-lg border border-ok-line bg-ok-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ok">
                  Sent to your webhook
                </p>
                <p className="text-sm text-ink-muted">
                  {formatMoney(extracted.total, extracted.currency)} from{" "}
                  {extracted.supplier || "this supplier"} was posted and saved to
                  this browser.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {savedInvoiceId ? (
                  <Link
                    href={`/invoices/${savedInvoiceId}`}
                    className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
                  >
                    View it
                  </Link>
                ) : null}
                <Button size="sm" variant="secondary" onClick={startOver}>
                  Scan another
                </Button>
              </div>
            </div>
          ) : (
            <>
              {webhookUrl === "" ? (
                <p className="rounded-lg border border-warn-line bg-warn-soft px-4 py-3 text-sm text-ink">
                  <span className="font-semibold text-warn">
                    No webhook configured.
                  </span>{" "}
                  Add a destination URL in{" "}
                  <Link
                    href="/settings"
                    className="font-medium text-accent underline underline-offset-2"
                  >
                    Settings
                  </Link>{" "}
                  to enable sending. You can still save this as a draft.
                </p>
              ) : (
                <p className="text-sm text-ink-muted">
                  Posting to{" "}
                  <span className="break-all font-mono text-xs text-ink">
                    {webhookUrl}
                  </span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  loading={phase === "sending"}
                  disabled={!canSend}
                  onClick={() => void runSend()}
                >
                  Send to webhook
                </Button>
                <Button variant="secondary" disabled={busy} onClick={saveDraft}>
                  Save as draft
                </Button>
                {draftSaved ? (
                  <span className="text-sm text-ok">
                    Saved as a draft.{" "}
                    {savedInvoiceId ? (
                      <Link
                        href={`/invoices/${savedInvoiceId}`}
                        className="font-medium underline underline-offset-2"
                      >
                        View it
                      </Link>
                    ) : null}
                  </span>
                ) : null}
                {phase === "sending" ? (
                  <span className="flex items-center gap-2 text-sm text-ink-muted">
                    <LoadingSpinner size={13} /> Posting…
                  </span>
                ) : null}
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

type StepRailProps = {
  phase: Phase;
  hasExtract: boolean;
  hasReview: boolean;
};

/** Compact status line so the current state of the workflow is never ambiguous. */
function StepRail({ phase, hasExtract, hasReview }: StepRailProps) {
  const steps = [
    {
      label: "Upload",
      state: hasExtract
        ? "done"
        : phase === "validating" || phase === "extracting"
          ? "active"
          : "todo",
    },
    {
      label: "Check",
      state: hasReview
        ? "done"
        : phase === "reviewing" || hasExtract
          ? "active"
          : "todo",
    },
    {
      label: "Send",
      state:
        phase === "sent" ? "done" : phase === "sending" ? "active" : "todo",
    },
  ] as const;

  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              step.state === "done"
                ? "border-ok-line bg-ok-soft text-ok"
                : step.state === "active"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink-faint",
            ].join(" ")}
          >
            <span aria-hidden="true" className="numeric">
              {index + 1}
            </span>
            {step.label}
          </span>
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="h-px w-3 bg-line-strong sm:w-6" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
