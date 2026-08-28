"use client";

import { useSyncExternalStore } from "react";

import type { Account } from "@/lib/auth/client";
import { isRole, type Role } from "@/lib/auth/roles";

/**
 * The signed-in user, on the client.
 *
 * One fetch of `GET /api/auth/session`, cached in a module-level store that
 * every reader shares. A hook that fetched per component would put the account
 * menu, the nav guard and the profile form on three separate round trips that
 * can disagree with each other for a moment.
 *
 * `null` means signed out *or* not yet resolved — the same value the server
 * render produces — so nothing here can mismatch on hydration. Callers that need
 * to tell "loading" from "signed out" read `useAccountStatus`.
 */
export interface Profile extends Account {
  /** A remote avatar (e.g. from Google), or null to fall back to initials. */
  avatarUrl?: string | null;
  /** Governs what the account may reach; the guard reads this. */
  role: Role;
  /** What the server says this account may do, already decided. */
  permissions: string[];
}

export type AccountStatus = "loading" | "signed-in" | "signed-out";

interface State {
  status: AccountStatus;
  profile: Profile | null;
}

/**
 * Cached so `useSyncExternalStore` sees a stable reference between renders —
 * returning a fresh object each call would loop.
 */
let state: State = { status: "loading", profile: null };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: State): void {
  state = next;
  listeners.forEach((listener) => listener());
}

interface SessionResponse {
  account: { id: string; email: string } | null;
  profile?: { displayName?: string | null; avatarUrl?: string | null } | null;
  role: string | null;
  permissions?: string[];
}

async function load(): Promise<void> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) {
      publish({ status: "signed-out", profile: null });
      return;
    }

    const data = (await response.json()) as SessionResponse;
    if (!data.account) {
      publish({ status: "signed-out", profile: null });
      return;
    }

    publish({
      status: "signed-in",
      profile: {
        id: data.account.id,
        email: data.account.email,
        name:
          data.profile?.displayName?.trim() || data.account.email.split("@")[0],
        avatarUrl: data.profile?.avatarUrl ?? null,
        // An unknown role is not a reason to guess upward. `tamu` is the least
        // privileged, and the server refuses anything above it anyway.
        role: isRole(data.role) ? data.role : "tamu",
        permissions: data.permissions ?? [],
      },
    });
  } catch {
    // Offline or the endpoint is down. Signed-out is the safe reading: it dims
    // what needs an account rather than showing it and failing on use.
    publish({ status: "signed-out", profile: null });
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // The first subscriber starts the fetch; the rest join the one already going.
  inFlight ??= load().finally(() => {
    inFlight = null;
  });
  return () => {
    listeners.delete(callback);
  };
}

function snapshot(): State {
  return state;
}

const SERVER_STATE: State = { status: "loading", profile: null };
function serverSnapshot(): State {
  return SERVER_STATE;
}

/**
 * Re-reads the session from the server.
 *
 * For the moments a screen knows the account changed underneath it — a saved
 * profile, a new avatar — so the top bar renames itself at once instead of at
 * the next reload. The server is asked again rather than the store being patched
 * locally, because the server is the one that knows.
 */
export async function refreshAccount(): Promise<void> {
  await load();
}

/** The current signed-in profile, or `null` while loading and when signed out. */
export function useAccount(): Profile | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot).profile;
}

/** Whether the session is still resolving, present, or absent. */
export function useAccountStatus(): AccountStatus {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot).status;
}

/**
 * The current account's role, or `null` before the session resolves.
 *
 * The read most role-conditional UI actually needs — a nav item asks "what am
 * I?", not for the whole profile.
 */
export function useRole(): Role | null {
  return useAccount()?.role ?? null;
}
