"use client";

import { useSyncExternalStore } from "react";

/**
 * What this visitor has liked and saved.
 *
 * Two different gestures that a single "star" would collapse: a like is a signal
 * to the person who made it, a save is a note to yourself. So they are kept
 * apart, and the wall can be narrowed to the saved ones while likes stay a count
 * on a card.
 *
 * Both live on the server now, keyed by the owner id the browser already
 * carries, which is what makes them survive a cleared cache and follow somebody
 * onto their phone when they sign in. This module is the optimistic layer over
 * that: the heart fills the instant it is pressed, the write goes out, and a
 * refusal puts it back — because a like that waits 200ms to acknowledge a tap
 * feels broken, and one that stays filled after the write failed is a lie.
 *
 * The seed comes from the server with each card (`liked`, `saved`), so a reload
 * shows the truth rather than whatever this store happened to remember.
 */

type Kind = "like" | "save";

interface Entry {
  liked: boolean;
  saved: boolean;
  likes: number;
}

/**
 * Cached by slug so `useSyncExternalStore` sees a stable reference — a fresh
 * object per render is a fresh identity every time, and re-renders forever.
 */
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Adopts what the server said about a card.
 *
 * Called as each card renders. It does not overwrite an entry this browser has
 * already touched: the optimistic value is newer than the page's data, and
 * letting the seed win would visibly un-press a button somebody just pressed.
 */
export function seedReaction(
  slug: string,
  seed: { liked: boolean | null; saved: boolean | null; likes: number },
): void {
  if (entries.has(slug)) return;
  entries.set(slug, {
    liked: seed.liked ?? false,
    saved: seed.saved ?? false,
    likes: seed.likes,
  });
}

function entry(slug: string): Entry | undefined {
  return entries.get(slug);
}

async function put(slug: string, kind: Kind, on: boolean): Promise<number> {
  const path = kind === "like" ? "like" : "save";
  const response = await fetch(`/api/showcase/${slug}/${path}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ on }),
  });
  if (!response.ok) throw new Error("gagal");
  const data = (await response.json()) as { on: boolean; likes: number };
  return data.likes;
}

/**
 * Flips a like or a save, and puts it back if the server refuses.
 *
 * The count moves with it. A heart that fills while the number beside it stays
 * put is the kind of half-update people notice immediately.
 */
async function toggle(slug: string, kind: Kind): Promise<void> {
  const current = entry(slug);
  if (!current) return;

  const field = kind === "like" ? "liked" : "saved";
  const next = !current[field];
  const before = { ...current };

  entries.set(slug, {
    ...current,
    [field]: next,
    likes:
      kind === "like" ? current.likes + (next ? 1 : -1) : current.likes,
  });
  announce();

  try {
    const likes = await put(slug, kind, next);
    const latest = entries.get(slug);
    if (latest) entries.set(slug, { ...latest, likes });
  } catch {
    entries.set(slug, before);
  } finally {
    announce();
  }
}

export function toggleLike(slug: string): void {
  void toggle(slug, "like");
}

export function toggleSave(slug: string): void {
  void toggle(slug, "save");
}

const NOTHING: Entry = { liked: false, saved: false, likes: 0 };

function snapshotFor(slug: string): Entry {
  return entries.get(slug) ?? NOTHING;
}

/** This visitor's state for one card: liked, saved, and the live like count. */
export function useReaction(slug: string): Entry {
  return useSyncExternalStore(
    subscribe,
    () => snapshotFor(slug),
    // The server render knows nothing about this browser, and rendering the
    // seed here instead would flash the wrong state on hydration.
    () => NOTHING,
  );
}
