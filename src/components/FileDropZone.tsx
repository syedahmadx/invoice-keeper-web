"use client";

import { useId, useState } from "react";
import type { DragEvent } from "react";
import { formatFileSize } from "@/lib/format";
import { ACCEPT_ATTRIBUTE } from "@/lib/validation";

type FileDropZoneProps = {
  file: File | null;
  /** Called with a file that passed the type and size checks. */
  onSelect: (file: File) => void;
  /** Called with a human-readable reason when a file was refused. */
  onReject: (reason: string) => void;
  onClear: () => void;
  accepted: readonly string[];
  maxBytes: number;
  maxLabel: string;
  disabled?: boolean;
};

export function FileDropZone({
  file,
  onSelect,
  onReject,
  onClear,
  accepted,
  maxBytes,
  maxLabel,
  disabled = false,
}: FileDropZoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const candidate = files?.[0];
    if (!candidate) return;

    if (!accepted.includes(candidate.type)) {
      onReject(
        `${candidate.name} is not a supported file type. Upload a JPG, PNG, WebP or PDF.`,
      );
      return;
    }
    if (candidate.size > maxBytes) {
      onReject(
        `${candidate.name} is ${formatFileSize(candidate.size)}. The limit is ${maxLabel}.`,
      );
      return;
    }
    onSelect(candidate);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  if (file) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line-strong bg-surface p-4">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5l-4-4Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M11.5 2.5v4h4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-ink-muted numeric">
            {formatFileSize(file.size)} · {file.type.replace("application/", "")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
        >
          Choose another
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      className={[
        "rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
        isDragging
          ? "border-accent bg-accent-soft"
          : "border-line-strong bg-surface",
        disabled ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="mx-auto text-ink-faint"
      >
        <path
          d="M14 18.5V5.5m0 0L9.5 10M14 5.5 18.5 10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.5 17.5v3a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      <p className="mt-3 text-sm text-ink">
        <label
          htmlFor={inputId}
          className="cursor-pointer font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          Choose a file
        </label>{" "}
        <span className="text-ink-muted">or drag one here</span>
      </p>
      <p className="mt-1 text-xs text-ink-faint">
        JPG, PNG, WebP or PDF · up to {maxLabel}
      </p>

      <input
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          // Allow re-picking the same file after a rejection.
          event.target.value = "";
        }}
      />
    </div>
  );
}
