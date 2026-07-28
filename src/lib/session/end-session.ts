"use client";

/**
 * Wipes every trace of this device's guest work.
 *
 * A photobooth often runs on a shared or public screen, so ending a session has
 * to leave the device as if this guest never touched it: no saved project, no
 * session code, no dismissed banners for the next person to inherit. Everything
 * this app parks in `localStorage` is namespaced under `framestudio:`, so
 * clearing that one prefix removes all of it in a single sweep — project, guest
 * session, and any UI flags — without this file having to name each key or drift
 * out of sync as new keys appear.
 */

const APP_PREFIX = "framestudio:";

export function clearDeviceData(): void {
  try {
    // Object.keys snapshots the names, so removing during the loop is safe.
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(APP_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked (private mode): there is nothing parked to clear anyway.
  }
}
