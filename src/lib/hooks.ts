"use client";

import { useSyncExternalStore } from "react";
import {
  getInvoices,
  getInvoicesServerSnapshot,
  getWebhookUrl,
  subscribeToStorage,
} from "@/lib/storage";
import type { ProcessedInvoice } from "@/types/invoice";

/**
 * localStorage is an external store, so it is read through
 * useSyncExternalStore rather than copied into state inside an effect. Writes
 * from anywhere in the app (or another tab) re-render every reader.
 */
export function useInvoices(): ProcessedInvoice[] {
  return useSyncExternalStore(
    subscribeToStorage,
    getInvoices,
    getInvoicesServerSnapshot,
  );
}

export function useWebhookUrl(): string {
  return useSyncExternalStore(subscribeToStorage, getWebhookUrl, () => "");
}

/**
 * False on the server and during hydration, true afterwards. Lets a page hold
 * back an empty state until it has actually looked at storage.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToStorage,
    () => true,
    () => false,
  );
}
