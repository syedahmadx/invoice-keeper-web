import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Invoice Keeper",
    template: "%s · Invoice Keeper",
  },
  description:
    "Read supplier invoices with AI, check the numbers, and post the confirmed data to your own webhook.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 self-start rounded-md text-ink"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 2.5h8a.5.5 0 0 1 .5.5v10.2a.3.3 0 0 1-.45.26L10.5 12.4l-1.55.92a.5.5 0 0 1-.51 0L6.9 12.4l-1.55.92a.5.5 0 0 1-.51 0L3.95 13.46A.3.3 0 0 1 3.5 13.2V3a.5.5 0 0 1 .5-.5Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5.75 6h4.5M5.75 8.5h3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Invoice Keeper
              </span>
            </Link>
            <SiteNav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-line bg-paper">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
            <p className="text-xs text-ink-muted">
              Invoices and settings are stored in this browser only. Nothing is
              kept on a server, and clearing your browser data deletes them.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
