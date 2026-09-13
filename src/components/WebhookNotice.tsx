"use client";

import Link from "next/link";
import { useHydrated, useWebhookUrl } from "@/lib/hooks";

/**
 * Nudges the user to set a webhook before they scan anything. Stays hidden until
 * storage has actually been read, so it never flashes on a configured browser.
 */
export function WebhookNotice() {
  const hydrated = useHydrated();
  const webhookUrl = useWebhookUrl();

  if (!hydrated || webhookUrl !== "") return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-warn-line bg-warn-soft p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink">
        <span className="font-semibold text-warn">No webhook configured.</span>{" "}
        You can still scan and save invoices, but sending is turned off until you
        add a destination URL.
      </p>
      <Link
        href="/settings"
        className="shrink-0 text-sm font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
      >
        Open settings
      </Link>
    </div>
  );
}
