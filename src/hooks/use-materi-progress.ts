"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "training-jsa-hiradc:materi-progress:v1";

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

/** Prerendered HTML has no storage, so the server always sees no progress. */
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
 * Which chapters the reader has worked through, persisted per device.
 *
 * A chapter is marked once the reader reaches it, so the sidebar can show a
 * running sense of progress that survives navigating away and back. localStorage
 * is an external store, so it's read through `useSyncExternalStore` — every
 * sidebar instance stays in sync and the prerendered page hydrates without a
 * mismatch (the server always starts from empty). Progress lives on the device
 * for now; the backend phase persists it against the peserta record.
 */
export function useMateriProgress() {
  const completed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const markComplete = useCallback((id: string) => {
    const current = getSnapshot();
    if (current.includes(id)) return;

    const next = [...current, id];

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Full or blocked storage is not worth interrupting the reader for.
    }

    listeners.forEach((listener) => listener());
  }, []);

  return { completed, markComplete };
}
