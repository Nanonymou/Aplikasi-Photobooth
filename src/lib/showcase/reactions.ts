"use client";

import { useSyncExternalStore } from "react";

/**
 * What this visitor has liked and saved.
 *
 * Two different gestures that a single "star" would collapse: a like is a
 * signal to the person who made it, a save is a note to yourself. So they are
 * kept apart, and the wall can be narrowed to the saved ones while likes stay a
 * count on a card.
 *
 * Both live in this browser. That is a stand-in for the account-scoped table
 * behind them, but it is the honest stand-in rather than component state: a
 * like that vanishes on reload is a decoration, and a saved design that vanishes
 * on reload is a promise broken by the one feature whose whole job is to
 * remember. When the endpoints exist, only the reading and writing move.
 */

const KEYS = {
  liked: "framestudio.showcase.liked",
  saved: "framestudio.showcase.saved",
} as const;

type Kind = keyof typeof KEYS;

const listeners = new Set<() => void>();

// Cached because `useSyncExternalStore` compares snapshots by identity: a fresh
// Set on every render would be a fresh object every time, and re-render forever.
const cache: Record<Kind, Set<string> | null> = { liked: null, saved: null };

function read(kind: Kind): Set<string> {
  try {
    const raw = localStorage.getItem(KEYS[kind]);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    // A private window, blocked site data, or a value somebody hand-edited into
    // nonsense. None of them is a reason to fail to render a wall of pictures.
    return new Set();
  }
}

function snapshot(kind: Kind): Set<string> {
  cache[kind] ??= read(kind);
  return cache[kind];
}

function announce() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === KEYS.liked) cache.liked = null;
  else if (event.key === KEYS.saved) cache.saved = null;
  else return;

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

const EMPTY: ReadonlySet<string> = new Set();

/** Nothing is liked or saved on the server; hydration fills it in. */
function serverSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

function toggle(kind: Kind, id: string) {
  const next = new Set(snapshot(kind));
  if (next.has(id)) next.delete(id);
  else next.add(id);

  cache[kind] = next;
  try {
    localStorage.setItem(KEYS[kind], JSON.stringify([...next]));
  } catch {
    // The gesture still lands for this visit; only the memory of it is lost.
  }
  announce();
}

export function toggleLike(id: string): void {
  toggle("liked", id);
}

export function toggleSave(id: string): void {
  toggle("saved", id);
}

export function useLiked(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => snapshot("liked").has(id),
    () => false,
  );
}

export function useSaved(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => snapshot("saved").has(id),
    () => false,
  );
}

/** Every saved id, for the "tersimpan" view. */
export function useSavedIds(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => snapshot("saved"),
    serverSnapshot,
  );
}
