"use client";

import { useSyncExternalStore } from "react";

import type { Account } from "@/lib/auth/mock-auth";

/**
 * The signed-in user, on the client.
 *
 * The workspace assumes a session behind it, so the account menu needs a profile
 * to show. This is that profile — mock data standing in for `GET /api/account/me`
 * until the endpoint lands, adding only what a profile display needs on top of
 * the auth `Account`: an optional avatar. The shape the menu reads does not move
 * when the real session replaces the body of this hook.
 */
export interface Profile extends Account {
  /** A remote avatar (e.g. from Google), or null to fall back to initials. */
  avatarUrl?: string | null;
}

const MOCK_PROFILE: Profile = {
  name: "Rara Prawira",
  email: "rara@contoh.id",
  avatarUrl: null,
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

/** Up to two initials for the avatar fallback, from the first and last word. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
