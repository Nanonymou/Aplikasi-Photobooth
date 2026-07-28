"use client";

import { useSyncExternalStore } from "react";

import type { Account } from "@/lib/auth/mock-auth";
import type { Role } from "@/lib/auth/roles";

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

const MOCK_PROFILE: Profile = {
  name: "Rara Prawira",
  email: "rara@contoh.id",
  avatarUrl: null,
  role: "admin",
};

/** The mock never changes after mount, so there is nothing to subscribe to. */
const subscribe = () => () => {};

/**
 * The current signed-in profile, or `null` during the server render.
 *
 * Read through `useSyncExternalStore` for the same reason the guest session is:
 * it renders `null` on the server and first paint, then the real profile once
 * mounted, so nothing that depends on client-only state mismatches on hydration.
 */
export function useAccount(): Profile | null {
  return useSyncExternalStore(subscribe, () => MOCK_PROFILE, () => null);
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
