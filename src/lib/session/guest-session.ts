"use client";

import { useSyncExternalStore } from "react";

/**
 * The anonymous guest's session, on the client.
 *
 * A photobooth is used by walk-up guests, so the whole app has to be useful
 * before there is an account: a session gives this browser an identity and a
 * short code, and every later visit from the same device continues it.
 *
 * The code comes from `/api/guest/session` and nowhere else. It used to be
 * minted here into `localStorage`, which read the same on screen but named a
 * session the server had never heard of — so "Pindahkan sekarang" in the claim
 * dialog handed that code to `/api/guest/claim`, which could only answer that
 * no such session exists. A code a guest can carry to another device has to be
 * a code the server knows.
 */

export interface GuestSession {
  /** Short, human-friendly, readable aloud — no 0/O or 1/I in its alphabet. */
  code: string;
  createdAt: string;
  lastSeenAt: string;
  /** When the booth may forget it, unless the guest comes back first. */
  expiresAt: string;
  /** Set once the guest signed in and took their work with them. */
  claimedAt: string | null;
}

interface SessionResponse {
  session: GuestSession | null;
}

/**
 * Cached so `useSyncExternalStore` sees a stable reference between renders —
 * returning a fresh object each call would loop.
 */
let session: GuestSession | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

/**
 * The most recently issued request, so a slower earlier one cannot overwrite a
 * newer answer. The guest editor opens with both a read and a start in flight —
 * the read says "no session yet" and the start creates one — and whichever the
 * network returns first is not the one that is true.
 */
let ticket = 0;

function publish(next: GuestSession | null): void {
  session = next;
  listeners.forEach((listener) => listener());
}

/** Reads whatever the server says, treating any failure as "no session". */
async function read(method: "GET" | "POST"): Promise<void> {
  const mine = ++ticket;
  try {
    const response = await fetch("/api/guest/session", {
      method,
      cache: "no-store",
    });
    if (mine !== ticket) return;
    if (!response.ok) {
      // A refused POST is the honest answer on an installation that has turned
      // guests off, and the UI that asked simply shows nothing.
      publish(null);
      return;
    }
    const data = (await response.json()) as SessionResponse;
    if (mine === ticket) publish(data.session);
  } catch {
    if (mine === ticket) publish(null);
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // The first subscriber starts the fetch; the rest join the one already going.
  inFlight ??= read("GET").finally(() => {
    inFlight = null;
  });
  return () => {
    listeners.delete(callback);
  };
}

function snapshot(): GuestSession | null {
  return session;
}

function serverSnapshot(): null {
  return null;
}

/**
 * The current guest session, or `null` while it resolves and when there is none.
 *
 * `null` is also what the server render produces, so nothing here can mismatch
 * on hydration. Consumers show a neutral placeholder — or nothing — until a
 * session arrives, which is the truthful reading either way: a browser that has
 * never saved anything has no session, and saying otherwise would put a code on
 * screen that stands for nothing.
 */
export function useGuestSession(): GuestSession | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/**
 * Starts this device's session, or keeps the existing one alive.
 *
 * The booth's front door. Idempotent on the server, so the screen that opens a
 * guest editor can call it on every visit and the same session comes back with
 * its clock pushed forward.
 */
export async function startGuestSession(): Promise<void> {
  await read("POST");
}

/** Re-reads the session, for a screen that knows it changed underneath. */
export async function refreshGuestSession(): Promise<void> {
  await read("GET");
}

/**
 * Hands the booth back: expires the session now and drops the owner cookie.
 *
 * The designs are not deleted — the work outlives the sitting, and an account
 * that claimed it can still reach it — but the next person to touch this screen
 * starts as themselves rather than inheriting the last guest's gallery.
 */
export async function endGuestSession(): Promise<void> {
  try {
    await fetch("/api/guest/session", { method: "DELETE", cache: "no-store" });
  } catch {
    // The device wipe that follows still happens; a session left open on the
    // server expires on its own, and no local trace of it remains either way.
  }
  ticket += 1;
  publish(null);
}

/** Whole days left before the session lapses, floored at 0. */
export function daysUntilExpiry(
  session: GuestSession,
  now = Date.now(),
): number {
  const remaining = new Date(session.expiresAt).getTime() - now;
  return Math.max(0, Math.floor(remaining / (24 * 60 * 60 * 1000)));
}
