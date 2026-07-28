"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy, Hourglass, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  daysUntilExpiry,
  useGuestSession,
  type GuestSession,
} from "@/lib/session/guest-session";
import { cn } from "@/lib/utils";

/** Kept in storage so a dismissal survives navigation between screens. */
const DISMISS_KEY = "framestudio:guest-banner-dismissed:v1";

/**
 * The dismissed flag lives outside React so `useSyncExternalStore` can read it
 * without a hydration mismatch: the server render is always "dismissed" (the
 * strip hidden), and the client re-reads once mounted. Writing notifies every
 * mounted banner, so dismissing on one screen closes it on the next.
 */
const dismissListeners = new Set<() => void>();

function subscribeDismiss(callback: () => void): () => void {
  dismissListeners.add(callback);
  return () => dismissListeners.delete(callback);
}

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function setDismissedFlag(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // A blocked quota only means the strip returns next visit; harmless.
  }
  dismissListeners.forEach((listener) => listener());
}

function ExpiryNote({ session }: { session: GuestSession }) {
  const days = daysUntilExpiry(session);
  if (days > 7) return null;

  return (
    <span className="text-muted-foreground hidden items-center gap-1 sm:flex">
      <Hourglass className="size-3" />
      {days === 0 ? "berakhir hari ini" : `${days} hari lagi`}
    </span>
  );
}

/**
 * The anonymous session strip.
 *
 * A guest never logged in, so the one thing they must understand is where their
 * work lives: on this device, under a code they can carry to another screen or
 * read to the booth operator. The strip says that plainly and offers the code,
 * then gets out of the way — dismissible, and the dismissal is remembered, so it
 * informs once rather than nagging every visit.
 */
export function GuestSessionBanner() {
  const session = useGuestSession();
  const reduceMotion = useReducedMotion();

  // Hidden during the server render (getServerSnapshot → true), re-read on the
  // client once mounted.
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    isDismissed,
    () => true,
  );
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Nothing actionable if the clipboard is blocked; the code is on screen.
    }
  }

  const open = !dismissed && session !== null;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          // Height animates so the stage below slides up as it closes, rather
          // than the strip vanishing and leaving the layout to jump.
          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          className="bg-editor-chrome border-editor-border shrink-0 overflow-hidden border-b"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
            <span className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium">
              <UserRound className="size-3" />
              Sesi tamu
            </span>

            <span className="text-muted-foreground hidden min-w-0 truncate sm:inline">
              Karyamu tersimpan di perangkat ini — simpan atau bagikan sebelum
              menutup.
            </span>

            <span className="text-muted-foreground sm:hidden">
              Tersimpan di perangkat ini.
            </span>

            <div className="ml-auto flex items-center gap-2">
              <ExpiryNote session={session} />

              <button
                type="button"
                onClick={copyCode}
                className={cn(
                  "border-editor-border hover:bg-accent focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono tracking-wider outline-none transition-colors focus-visible:ring-[3px]",
                )}
                aria-label={`Salin kode sesi ${session.code}`}
                title="Salin kode sesi"
              >
                {copied ? (
                  <Check className="size-3 text-primary" />
                ) : (
                  <Copy className="text-muted-foreground size-3" />
                )}
                {session.code}
              </button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={setDismissedFlag}
                aria-label="Tutup info sesi"
                className="size-6"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
