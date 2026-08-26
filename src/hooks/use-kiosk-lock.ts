"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

export interface KioskLock {
  /** Whether the booth is currently holding the screen. */
  locked: boolean;
  /** Whether the browser is in fullscreen right now. */
  fullscreen: boolean;
  /**
   * Locked, fullscreen was available, and the screen is not in it — the moment
   * the curtain goes up and the guest is asked to give the screen back.
   */
  escaped: boolean;
  /** Whether this browser offers fullscreen and has not refused it. */
  canFullscreen: boolean;
  /** Takes the screen. Must be called from a user gesture. */
  engage: () => void;
  /** Puts the screen back the way it was found. */
  release: () => void;
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function readFullscreen() {
  return document.fullscreenElement !== null;
}

function subscribeNothing() {
  return () => {};
}

function readSupported() {
  return (
    document.fullscreenEnabled &&
    typeof document.documentElement.requestFullscreen === "function"
  );
}

/** Both are false on the server, and correct themselves on hydration. */
function readFalse() {
  return false;
}

/**
 * Holds the screen for a booth.
 *
 * Three doors, all of which a curious guest finds within a minute of being left
 * alone with a tablet: leaving fullscreen (F11, Escape, a swipe), the browser's
 * back button, and the context menu with its "view source" and "open in new
 * tab". None of them can be *prevented* — no page may refuse Escape, and it
 * would be a worse web if one could — so the lock does the only honest thing it
 * can: it notices, and asks for the screen back.
 *
 * The curtain never rises on a browser that cannot give fullscreen, or that
 * refused the request. A device like that would otherwise be nagged forever
 * about a state it can never reach, and the booth would be unusable on exactly
 * the hardware most likely to be running it.
 */
export function useKioskLock(): KioskLock {
  const [locked, setLocked] = useState(false);
  const [refused, setRefused] = useState(false);

  const fullscreen = useSyncExternalStore(
    subscribeFullscreen,
    readFullscreen,
    readFalse,
  );
  const supported = useSyncExternalStore(
    subscribeNothing,
    readSupported,
    readFalse,
  );

  const engage = useCallback(() => {
    setLocked(true);
    setRefused(false);

    // One spare history entry, put back every time it is consumed, so the
    // browser's Back gesture lands on this screen instead of the page before it.
    history.pushState(null, "", location.href);
    window.addEventListener("popstate", pushAgain);
    document.addEventListener("contextmenu", preventDefault);

    document.documentElement.requestFullscreen?.().catch(() => setRefused(true));
  }, []);

  const release = useCallback(() => {
    setLocked(false);
    window.removeEventListener("popstate", pushAgain);
    document.removeEventListener("contextmenu", preventDefault);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const canFullscreen = supported && !refused;

  return {
    locked,
    fullscreen,
    escaped: locked && canFullscreen && !fullscreen,
    canFullscreen,
    engage,
    release,
  };
}

function pushAgain() {
  history.pushState(null, "", location.href);
}

function preventDefault(event: Event) {
  event.preventDefault();
}
