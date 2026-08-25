"use client";

import { useSyncExternalStore } from "react";

import type { Account } from "@/lib/auth/mock-auth";
import { isRole, type Role } from "@/lib/auth/roles";

/**
 * The signed-in user, on the client.
 *
 * The workspace assumes a session behind it, so the account menu needs a profile
 * to show. This is that profile — mock data standing in for `GET /api/account/me`
 * until the endpoint lands, adding what a profile display and the RBAC guard
 * need on top of the auth `Account`: an optional avatar and the account's role.
 * The shape the readers use does not move when the real session replaces the
 * body of this hook.
 */
export interface Profile extends Account {
  /** A remote avatar (e.g. from Google), or null to fall back to initials. */
  avatarUrl?: string | null;
  /** Governs what the account may reach; the guard reads this. */
  role: Role;
}

const BASE_PROFILE: Omit<Profile, "role"> = {
  name: "Rara Prawira",
  email: "rara@contoh.id",
  avatarUrl: null,
};

/** The default mock role, and where a switch is persisted so it survives reloads. */
const DEFAULT_ROLE: Role = "admin";
const ROLE_KEY = "framestudio:mock-role:v1";

/**
 * The mock is a tiny store so the role can be switched at runtime — the demo
 * that makes role-based navigation visible without editing code. Cached so
 * `useSyncExternalStore` sees a stable reference, and rebuilt only on a switch.
 */
let cached: Profile | null = null;
const listeners = new Set<() => void>();

function readRole(): Role {
  try {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (isRole(stored)) return stored;
  } catch {
    // Unreadable storage: fall back to the default role.
  }
  return DEFAULT_ROLE;
}

function clientSnapshot(): Profile {
  if (!cached) cached = { ...BASE_PROFILE, role: readRole() };
  return cached;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function publish(next: Profile): void {
  cached = next;
  listeners.forEach((listener) => listener());
}

/**
 * Switches the mock account's role and notifies every reader, so role-gated
 * navigation re-renders at once. Frontend-only: the real session is set by the
 * server at sign-in, not flipped in the client.
 */
export function setMockRole(role: Role): void {
  publish({ ...clientSnapshot(), role });
  try {
    window.localStorage.setItem(ROLE_KEY, role);
  } catch {
    // A blocked write only means the switch does not survive a reload; harmless.
  }
}

/**
 * Applies an edited profile to the store.
 *
 * The profile form saves through this, so the top bar renames itself the moment
 * the save lands rather than at the next reload. Deliberately not persisted:
 * where an edited profile *lives* is the endpoint's job, and a copy parked in
 * this browser would be the wrong answer for the next device.
 */
export function setMockProfile(update: {
  name?: string;
  avatarUrl?: string | null;
}): void {
  publish({ ...clientSnapshot(), ...update });
}

/**
 * The current signed-in profile, or `null` during the server render.
 *
 * Read through `useSyncExternalStore` for the same reason the guest session is:
 * it renders `null` on the server and first paint, then the real profile once
 * mounted, so nothing that depends on client-only state mismatches on hydration.
 */
export function useAccount(): Profile | null {
  return useSyncExternalStore(subscribe, clientSnapshot, () => null);
}

/**
 * The current account's role, or `null` before the session resolves.
 *
 * The read most role-conditional UI actually needs — a nav item or a menu entry
 * asks "what am I?", not for the whole profile — so it gets its own hook rather
 * than reaching through `useAccount().role` and re-rendering on unrelated profile
 * changes.
 */
export function useRole(): Role | null {
  return useAccount()?.role ?? null;
}
