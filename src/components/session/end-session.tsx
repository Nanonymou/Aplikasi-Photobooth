"use client";

import { useState } from "react";
import { Loader2, LogOut, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logout } from "@/lib/auth/client";
import { clearDeviceData } from "@/lib/session/end-session";

/**
 * "End session" for a shared device.
 *
 * A photobooth is often a public screen a stranger uses next, so a guest needs a
 * deliberate way to leave nothing behind: wipe the design, the session code, and
 * anything else saved on this device. Because that erases device-only work for
 * good, it asks first and says plainly what disappears — then clears everything
 * and reloads to a clean start so no stale state survives the reset.
 */
function EndSessionConfirm({ onCancel }: { onCancel: () => void }) {
  const [busy, setBusy] = useState(false);

  async function end() {
    if (busy) return;
    setBusy(true);
    // Sign out the (mock) account first, then erase everything this device
    // stored. A full reload, not a client route change, guarantees no cached
    // session or project outlives the wipe for the next person.
    await logout();
    clearDeviceData();
    window.location.assign("/");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <LogOut className="text-destructive size-5" />
          Akhiri sesi di perangkat ini?
        </DialogTitle>
        <DialogDescription>
          Cocok untuk perangkat bersama atau umum. Desain, foto, dan kode sesi
          yang tersimpan di perangkat ini akan dihapus supaya tidak terlihat
          orang berikutnya.
        </DialogDescription>
      </DialogHeader>

      <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
        <TriangleAlert className="mt-0.5 size-3 shrink-0" />
        Karya yang belum disimpan ke akun akan hilang dan tidak bisa
        dikembalikan.
      </p>

      <DialogFooter className="sm:items-center sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
        <Button variant="destructive" size="sm" onClick={end} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
          Akhiri &amp; bersihkan
        </Button>
      </DialogFooter>
    </>
  );
}

/** Top-bar entry into the end-session flow, shown on the guest session page. */
export function EndSessionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-destructive gap-1.5"
      >
        <LogOut />
        <span className="hidden sm:inline">Akhiri sesi</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <EndSessionConfirm onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
