"use client";

import { useState } from "react";

import {
  clearSession,
  logout,
  POST_LOGOUT_REDIRECT,
} from "@/lib/auth/mock-auth";

/**
 * The sign-out sequence, in one place.
 *
 * Every "Keluar" runs the same three steps in the same order: forget the session
 * on this device, tell the server (mock) to drop the cookie, then a full reload
 * to the login page so nothing signed-in lingers behind the sign-out. Callers get
 * a `busy` flag to disable the control while it runs, and the whole thing lives
 * here so the account menu and any later exit point stay identical.
 */
export function useLogout() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    clearSession();
    await logout();
    // A hard navigation, not a client route change, guarantees no cached
    // signed-in state survives into the login screen.
    window.location.assign(POST_LOGOUT_REDIRECT);
  }

  return { signOut, busy };
}
