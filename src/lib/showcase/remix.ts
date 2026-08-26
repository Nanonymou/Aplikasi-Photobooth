"use client";

import { useSyncExternalStore } from "react";

/**
 * The design the current session was started from.
 *
 * A remix credit is not decoration — it is the reason somebody was willing to
 * publish in the first place — so it has to outlive the click that created it.
 * Keeping it only in the URL would lose it on the first reload, which is exactly
 * when a guest is most likely to be looking at what they have made.
 *
 * Stored per browser alongside the guest session, which is where an anonymous
 * guest's work lives at this stage. When designs are saved to an account the
 * credit becomes a column on the row and this module becomes the reader for it.
 */

const STORAGE_KEY = "framestudio.remix.credit";

export interface RemixCredit {
  id: string;
  title: string;
  author: string;
}

const listeners = new Set<() => void>();

let cache: RemixCredit | null | undefined;

function read(): RemixCredit | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    if (
      typeof value.id !== "string" ||
      typeof value.title !== "string" ||
      typeof value.author !== "string"
    ) {
      return null;
    }
    return { id: value.id, title: value.title, author: value.author };
  } catch {
    return null;
  }
}

function snapshot(): RemixCredit | null {
  if (cache === undefined) cache = read();
  return cache;
}

function serverSnapshot(): RemixCredit | null {
  return null;
}

function announce() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  cache = undefined;
  announce();
}

function subscribe(onChange: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(onChange);

  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useRemixCredit(): RemixCredit | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** Records the credit, unless the same one is already recorded. */
export function rememberRemix(credit: RemixCredit): void {
  if (snapshot()?.id === credit.id) return;

  cache = credit;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credit));
  } catch {
    // The credit still shows for this visit; only the memory of it is lost.
  }
  announce();
}

export function forgetRemix(): void {
  cache = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — the next read simply finds what is still there.
  }
  announce();
}
