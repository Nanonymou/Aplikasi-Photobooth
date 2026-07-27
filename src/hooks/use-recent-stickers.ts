"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "framestudio:recent-stickers:v1";
const MAX_RECENT = 8;

/** Stable empty result, so the server snapshot never changes identity. */
const EMPTY: string[] = [];

const listeners = new Set<() => void>();

// getSnapshot must return the same reference until the data actually changes,
// otherwise useSyncExternalStore re-renders forever. Cache against the raw
// string so a re-parse only happens when localStorage really moved.
let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }

  return cachedValue;
}

/** Prerendered HTML has no storage, so the server always sees an empty list. */
function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Ids of the stickers used most recently, newest first.
 *
 * localStorage is an external store, so it is read through
 * `useSyncExternalStore` — that keeps the value consistent across every panel
 * instance and avoids a hydration mismatch on the prerendered editor page.
 */
export function useRecentStickers() {
  const recent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const remember = useCallback((id: string) => {
    const next = [id, ...getSnapshot().filter((item) => item !== id)].slice(
      0,
      MAX_RECENT,
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Full or blocked storage is not worth interrupting the user for.
    }

    listeners.forEach((listener) => listener());
  }, []);

  return { recent, remember };
}
