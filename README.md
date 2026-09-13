# Invoice Keeper

Read a supplier invoice once, check it, and post the confirmed data to your own webhook.

## The problem

Small business owners and freelancers receive supplier invoices as phone photos and
PDF attachments. Typing them into accounting software by hand is slow and
error-prone, and the mistakes are usually only caught weeks later at
reconciliation — by which point the payment has already gone out.

## Who it is for

A freelancer or small business owner who already has an accounting workflow — Xero,
QuickBooks, a Make.com or Zapier scenario — and wants to stop keying invoices into
it by hand. It assumes you have somewhere to send the data; it does not try to be
your accounting system.

## How it works

1. **Upload** an invoice image or PDF. An AI pass extracts the supplier, tax ID,
   invoice number, dates, currency, line items and totals into structured fields.
2. **Check.** A second AI pass reviews the *extracted data* for the problems a
   bookkeeper would catch: line items that do not sum to the subtotal, a subtotal
   plus tax that does not equal the total, a missing tax ID, a future issue date, a
   due date before the issue date, a missing invoice number, an implausible total.
   Findings are colour-coded by severity, and you correct anything wrong in an
   editable form.
3. **Send.** The confirmed JSON is posted to a webhook URL you configure.

The app also acts as a secure proxy for a companion Android app: the Android client
posts to the same `/api/*` endpoints, so the API key never has to ship inside a
mobile binary.

## Features

- Drag-and-drop or file-picker upload of JPG, PNG, WebP and PDF, up to 8 MB, with
  type and size rejection before anything is sent.
- AI extraction into a typed `ExtractedInvoice` shape, with defensive parsing —
  markdown fences stripped, every numeric field coerced to a number.
- A second AI review pass producing typed `ReviewFinding[]`, which degrades to an
  empty list rather than failing the whole flow if the model returns nothing usable.
- A fully editable form: every extracted field, plus a line-items table with add and
  remove row and a **live-recalculated line items total** that flags the moment your
  edits stop matching the stated subtotal.
- Save as draft, or send to your webhook; drafts can be sent later from their detail
  page.
- Invoice history with a supplier/invoice-number filter, a status filter, and totals
  for the filtered set **grouped by currency**.
- A settings screen that validates the webhook URL, sends a test payload, reports
  whether the server has an API key, and clears all local data behind a confirm step.
- Every async action is single-flight: the button disables and a ref guard blocks a
  second request even if a click slips through.
- Responsive down to 375px. Wide screens get real tables; narrow screens get card
  layouts, because a five-column money table cannot stay legible on a phone and
  horizontal scrolling hides the amounts.

## Route map

| Route | What it is |
| --- | --- |
| `/` | Landing page: what the app does, the three-step flow, and a prompt to configure a webhook if there is none |
| `/scan` | The core workflow — upload, extract, edit, review, send or save as draft |
| `/invoices` | Saved invoice history with text and status filters and filtered totals |
| `/invoices/[id]` | Detail view: full extracted data, findings, delete, and re-send for drafts |
| `/settings` | Webhook URL, test payload, API-key status, data statement, clear all data |
| `POST /api/extract` | Proxies the file to the extraction provider. `{ fileBase64, mimeType, fileName }` → `{ provider, data }` |
| `POST /api/review` | Proxies extracted fields to the review provider. `{ extracted }` → `{ provider, findings }` |
| `POST /api/send` | Forwards a payload to your webhook. `{ webhookUrl, payload }` → `{ ok, status, body }` |
| `GET /api/config` | Returns `{ apiKeyConfigured: boolean, extractionProvider, reviewProvider }` — a boolean only, never the key |

### API error codes

`/api/extract` and `/api/review` map failures onto: **400** validation, **401**
missing key, **429** provider rate limit, **504** timeout (30s), **502** other
upstream failure. Every error body is `{ error: string, kind: string }`.

## Setting `GEMINI_API_KEY`

Create `.env.local` in the project root (it is already listed in `.gitignore` via
`.env*`, so it is never committed):

```
GEMINI_API_KEY=your-key-here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Restart the
dev server after changing it. Settings will show **API key configured** once the
server can see it.

## How the proxy protects the key

The key is read **only** as `process.env.GEMINI_API_KEY`, and **only** inside
`src/lib/providers/gemini.ts`, which is imported exclusively by the route handlers
under `src/app/api/`. No client component imports it, and the name is not prefixed
`NEXT_PUBLIC_`, so Next.js will not inline it into any browser bundle.

The browser therefore never talks to the model provider. It posts the file to
`/api/extract` on the same origin; the server attaches the key and calls the
provider. The same holds for the companion Android app, which is why the proxy
exists at all — a key shipped inside an APK can be extracted from it.

`/api/config` exists so the UI can tell you whether a key is present without ever
receiving its value: it returns a boolean.

`/api/send` is a proxy for a different reason: arbitrary webhook endpoints do not
send CORS headers, so a browser could not post to them directly. Only `https://`
URLs are accepted, so payloads are never sent in the clear.

## Data storage

There is no database and no account. Invoice history and your webhook URL live in
**this browser's `localStorage`**. Another browser, another device, or a private
window will not see them, and clearing your browser data deletes them. The app
keeps no copy of your invoices on the server. This is stated in the footer of every
page and in full on the Settings screen.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

```bash
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```

Requires Node.js 20.9 or newer (a Next.js 16 requirement).

## Swapping the AI provider

Provider wiring lives in exactly two places:

- `src/lib/providers/config.ts` — `EXTRACTION_PROVIDER`, `REVIEW_PROVIDER`,
  `GEMINI_MODEL`, and the request timeout.
- `src/lib/providers/index.ts` — the single re-export the route handlers import from.

Extraction and review are independent steps, so they can run on different providers.
To use a second provider for the review pass, add a module alongside `gemini.ts`
exporting a `reviewInvoice` with the same signature, change `REVIEW_PROVIDER`, and
point the one re-export in `index.ts` at it. Nothing else in the app names a
provider — the UI reads the provider name off each API response and shows it on the
panel it produced.

## Project structure

```
src/
  app/
    layout.tsx                 shared header, nav, footer
    page.tsx                   landing
    globals.css                design tokens (Tailwind v4 @theme)
    scan/page.tsx              the core workflow
    invoices/page.tsx          history with filters
    invoices/[id]/page.tsx     detail, delete, re-send
    settings/page.tsx          webhook, key status, data controls
    api/{extract,review,send,config}/route.ts
  components/                  presentational, typed; pages own the state
  lib/
    providers/                 config, errors, gemini (server only), index
    storage.ts                 localStorage, SSR-guarded
    format.ts                  money/date formatting, sumLineItems
    validation.ts              mime allowlist, size cap, URL and shape checks
    client.ts                  fetch helpers for the browser
    hooks.ts                   useSyncExternalStore bindings over storage
    api.ts                     route-handler helpers
  types/invoice.ts             the shared domain types
```
