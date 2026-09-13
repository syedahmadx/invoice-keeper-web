import { ButtonLink } from "@/components/Button";
import { WebhookNotice } from "@/components/WebhookNotice";
import { EXTRACTION_PROVIDER, REVIEW_PROVIDER } from "@/lib/providers/config";

const STEPS = [
  {
    number: "01",
    title: "Upload",
    body: `Drop in a photo or PDF of a supplier invoice. ${EXTRACTION_PROVIDER} reads the supplier, dates, line items and totals into structured fields.`,
  },
  {
    number: "02",
    title: "Check",
    body: `A second pass by ${REVIEW_PROVIDER} looks for the mistakes that surface weeks later: totals that do not add up, a missing tax ID, a due date before the issue date. Correct anything wrong in the form.`,
  },
  {
    number: "03",
    title: "Send",
    body: "The confirmed JSON is posted to a webhook URL you configure — your Xero or QuickBooks integration, a Make.com scenario, a Zapier hook, anything that accepts a POST.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="max-w-2xl space-y-5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
          Supplier invoices, without the keying
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          Read an invoice once. Check it. Send it on.
        </h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Invoice Keeper turns a photo or PDF of a supplier invoice into
          structured data, has a second model review that data for the errors a
          reconciliation would catch weeks later, and lets you correct anything
          before posting the confirmed JSON to your own webhook. It is built for
          freelancers and small business owners who already have an accounting
          workflow and want to stop typing invoices into it by hand.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <ButtonLink href="/scan" variant="primary">
            Scan an invoice
          </ButtonLink>
          <ButtonLink href="/invoices" variant="ghost">
            View saved invoices
          </ButtonLink>
        </div>
      </section>

      <WebhookNotice />

      <section aria-labelledby="how-it-works" className="space-y-4">
        <h2
          id="how-it-works"
          className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted"
        >
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="space-y-2 rounded-xl border border-line bg-surface p-5"
            >
              <span className="text-xs font-semibold text-accent numeric">
                {step.number}
              </span>
              <h3 className="text-base font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-4 border-t border-line pt-8 sm:grid-cols-2">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-ink">
            Your key stays on the server
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            The browser never talks to the model provider. Every call goes
            through this app&rsquo;s own API routes, which hold the key in
            server-side environment variables. The companion Android app uses the
            same endpoints for the same reason.
          </p>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-ink">
            Your data stays on your device
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            There is no database and no account. Invoice history and your webhook
            URL live in this browser&rsquo;s local storage, and you can wipe them
            from Settings at any time.
          </p>
        </div>
      </section>
    </div>
  );
}
