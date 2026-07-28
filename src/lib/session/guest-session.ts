"use client";

import { useSyncExternalStore } from "react";

/**
 * The anonymous guest's session, on the client.
 *
 * A photobooth is used by walk-up guests, so the whole app has to be useful
 * before there is an account: the first visit mints a session code, parks it in
 * `localStorage`, and every later visit from the same device continues it. That
 * mirrors the backend's `framestudio_owner` cookie exactly — same idea, same
 * lifetime — but stated on the client so the guest UI can name it ("your work
 * is saved on this device") without a round trip.
 *
 * This is mock data on purpose: the frontend is built first, assuming the
 * session API contract (`{ code, createdAt, expiresAt }`) rather than waiting on
 * it. When the real session endpoint lands it replaces the body of the hook;
 * the shape the UI reads does not move.
 */

const STORAGE_KEY = "framestudio:guest-session:v1";

/** Matches the anonymous-owner retention the backend already keeps: 30 days. */
const SESSION_DAYS = 30;

/** Unambiguous, readable aloud, printed on a receipt — no 0/O or 1/I. */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

export interface GuestSession {
  /** Short human-friendly code identifying this device's session. */
  code: string;
  /** ISO timestamp the session began. */
  createdAt: string;
  /** ISO timestamp after which the booth may forget it. */
  expiresAt: string;
}

interface StoredSession {
  code: string;
  createdAt: string;
}

function isStoredSession(value: unknown): value is StoredSession {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as StoredSession).code === "string" &&
    typeof (value as StoredSession).createdAt === "string"
  );
}

function randomCode(): string {
  const values =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
      : Array.from({ length: CODE_LENGTH }, () =>
          Math.floor(Math.random() * 256),
        );

  let code = "";
  for (const byte of values) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

function expiryOf(createdAt: string): string {
  const expires = new Date(createdAt);
  expires.setDate(expires.getDate() + SESSION_DAYS);
  return expires.toISOString();
}

/**
 * Reads the device's session, minting one on the first visit.
 *
 * A stray write can only come from tampering; an unreadable entry degrades to a
 * fresh session rather than throwing, the same way the project loader does.
 */
function readOrCreate(): GuestSession {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredSession(parsed)) {
        return {
          code: parsed.code,
          createdAt: parsed.createdAt,
          expiresAt: expiryOf(parsed.createdAt),
        };
      }
    }
  } catch {
    // Fall through and start a fresh session.
  }

  const created: StoredSession = {
    code: randomCode(),
    createdAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
  } catch {
    // Private mode or a full quota: the session still works for this visit.
  }

  return { ...created, expiresAt: expiryOf(created.createdAt) };
}

/**
 * Minted once per page load and cached, so every reader shares one session and
 * `useSyncExternalStore` sees a stable reference rather than a new object each
 * render — a fresh object every call would loop it.
 */
let cached: GuestSession | null = null;

function clientSnapshot(): GuestSession {
  if (!cached) cached = readOrCreate();
  return cached;
}

/** The session never changes after mount, so there is nothing to subscribe to. */
const subscribe = () => () => {};

/**
 * The current guest session, or `null` during the server render.
 *
 * Read through `useSyncExternalStore` rather than an effect: it renders `null`
 * during hydration so the server and client markup agree, then re-renders with
 * the real session — the hydration-safe way to touch `localStorage`, and the
 * one the React 19 rules allow. Consumers show a neutral placeholder while it is
 * `null`.
 */
export function useGuestSession(): GuestSession | null {
  return useSyncExternalStore(subscribe, clientSnapshot, () => null);
}

/** Whole days left before the session lapses, floored at 0. */
export function daysUntilExpiry(session: GuestSession, now = Date.now()): number {
  const remaining = new Date(session.expiresAt).getTime() - now;
  return Math.max(0, Math.floor(remaining / (24 * 60 * 60 * 1000)));
}
