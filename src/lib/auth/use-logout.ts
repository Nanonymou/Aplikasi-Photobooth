"use client";

import { useState } from "react";

import { logout, POST_LOGOUT_REDIRECT } from "@/lib/auth/client";

/**
 * The sign-out sequence, in one place.
 *
 * Two steps in one order: tell the server to drop the session cookie, then a
 * full reload to the login page so nothing signed-in lingers behind the sign-
 * out. The device-local `clearSession` that used to run first is gone with the
 * mock — the session was never in this browser's storage, it was a cookie, and
 * the server is the only thing that can end it.
 *
 * The guest owner cookie is deliberately left alone: it is the identity for work
 * saved *after* signing out, and dropping it here would hide a guest's own
 * designs from them.
 */
export function useLogout() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    await logout();
    // A hard navigation, not a client route change, guarantees no cached
    // signed-in state survives into the login screen.
    window.location.assign(POST_LOGOUT_REDIRECT);
  }

  return { signOut, busy };
}
