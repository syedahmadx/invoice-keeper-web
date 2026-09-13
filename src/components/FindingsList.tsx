import type { FindingSeverity, ReviewFinding } from "@/types/invoice";
import { ProviderTag } from "./ProviderTag";

const SEVERITY_STYLES: Record<
  FindingSeverity,
  { container: string; label: string; dot: string }
> = {
  error: {
    container: "border-danger-line bg-danger-soft",
    label: "text-danger",
    dot: "bg-danger",
  },
  warning: {
    container: "border-warn-line bg-warn-soft",
    label: "text-warn",
    dot: "bg-warn",
  },
  info: {
    container: "border-line bg-sunken",
    label: "text-ink-muted",
    dot: "bg-ink-faint",
  },
};

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

type FindingsListProps = {
  findings: ReviewFinding[];
  provider: string;
};

/** The review pass output, most serious first. */
export function FindingsList({ findings, provider }: FindingsListProps) {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          Review findings
          <span className="ml-2 font-normal text-ink-muted numeric">
            {findings.length}
          </span>
        </h3>
        <ProviderTag provider={provider} action="reviewed" />
      </div>

      {sorted.length === 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-ok-line bg-ok-soft p-3.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-ok"
          >
            <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M5.25 8.25 7 10l3.75-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm text-ok">
            No problems found. The arithmetic adds up and the required fields are
            present.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((finding, index) => {
            const styles = SEVERITY_STYLES[finding.severity];
            return (
              <li
                key={`${finding.field}-${index}`}
                className={`flex gap-3 rounded-lg border p-3.5 ${styles.container}`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`}
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[11px] uppercase tracking-wide">
                    <span className={`font-semibold ${styles.label}`}>
                      {finding.severity}
                    </span>
                    <span className="font-mono text-ink-faint normal-case tracking-normal">
                      {finding.field}
                    </span>
                  </p>
                  <p className="text-sm text-ink">{finding.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
