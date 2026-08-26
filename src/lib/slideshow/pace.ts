"use client";

import { useSyncExternalStore } from "react";

/**
 * How fast the wall moves, and how the operator's choice survives a reload.
 *
 * A slideshow runs for hours on a screen nobody is sitting at, so the pace is
 * the one setting that actually gets touched: eight photos and a slow room want
 * fifteen seconds a frame, a queue at the booth wants three. It lives here as a
 * small store rather than in component state so the value, its bounds, and the
 * way it is remembered are one thing — and so a wall opened in two windows on
 * the same machine does not disagree with itself.
 */

/** Seconds each photo holds, slowest last. */
export const PACE_OPTIONS = [3, 5, 8, 15] as const;

export type Pace = (typeof PACE_OPTIONS)[number];

export const DEFAULT_PACE: Pace = 5;

const STORAGE_KEY = "framestudio.slideshow.pace";

function isPace(value: number): value is Pace {
  return (PACE_OPTIONS as readonly number[]).includes(value);
}

/**
 * The remembered pace, or the default.
 *
 * Wrapped in try/catch because a private window, a browser set to block site
 * data, or a thumbnail renderer all throw on the accessor itself — and a wall
 * display that failed to paint over a saved preference would be a poor trade.
 */
function read(): Pace {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return isPace(stored) ? stored : DEFAULT_PACE;
  } catch {
    return DEFAULT_PACE;
  }
}

const listeners = new Set<() => void>();

// Cached because `useSyncExternalStore` compares snapshots by identity and calls
// the getter on every render — reading `localStorage` each time would work but
// puts a synchronous disk-backed read in the render path of a screen that is
// animating.
let cached: Pace | null = null;

function announce() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  cached = null;
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

function snapshot(): Pace {
  cached ??= read();
  return cached;
}

/** The server has no storage; the default is what it renders, and hydration
 *  corrects it without a mismatch because this is what both sides start from. */
function serverSnapshot(): Pace {
  return DEFAULT_PACE;
}

export function usePace(): Pace {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function setPace(pace: Pace): void {
  cached = pace;
  try {
    localStorage.setItem(STORAGE_KEY, String(pace));
  } catch {
    // A remembered pace is a convenience; losing it costs one tap.
  }
  announce();
}

/** The neighbouring pace in a direction, clamped at both ends. */
export function stepPace(pace: Pace, direction: 1 | -1): Pace {
  const index = PACE_OPTIONS.indexOf(pace);
  return PACE_OPTIONS[index + direction] ?? pace;
}
