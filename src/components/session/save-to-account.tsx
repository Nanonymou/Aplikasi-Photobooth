"use client";

import { useState } from "react";
import { CloudCheck, Info, Loader2, UserRoundPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGuestSession } from "@/lib/session/guest-session";
import { toast } from "@/store/toast-store";

/** Good enough to catch a typo; the real check is the account service's job. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The claim flow.
 *
 * A guest's work lives only on this device, so the one upgrade that matters is
 * moving it somewhere that survives a cleared browser or a second phone. This
 * collects the email an account would be created under and claims the current
 * session's work into it.
 *
 * The call is mocked on purpose — the frontend is built first, assuming the
 * contract `POST /api/account/claim { sessionCode, email }`. It is framed
 * honestly as a preview rather than pretending to log anyone in; when the
 * account service lands it replaces `submit` and nothing the user sees moves.
 */
function ClaimSheet({ onClose }: { onClose: () => void }) {
  const session = useGuestSession();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const valid = EMAIL.test(email.trim());

  async function submit() {
    if (!valid || !session) return;
    setBusy(true);

    // Stand-in for `POST /api/account/claim`. The delay keeps the button's
    // loading state honest so the real request drops straight in.
    await new Promise((resolve) => setTimeout(resolve, 700));

    setBusy(false);
    setDone(true);
    toast({
      variant: "success",
      title: "Karyamu diamankan",
      description: `Sesi ${session.code} akan dipindahkan ke ${email.trim()}.`,
    });
  }

  if (done) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudCheck className="text-primary size-5" />
            Karyamu diamankan
          </DialogTitle>
          <DialogDescription>
            Semua desain dari perangkat ini akan tersimpan di akun{" "}
            <span className="text-foreground font-medium">{email.trim()}</span>,
            jadi tetap ada meski browser dibersihkan atau kamu ganti perangkat.
          </DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
          <Info className="mt-0.5 size-3 shrink-0" />
          Layanan akun masih dalam persiapan — ini pratinjau alurnya. Sementara
          itu karyamu tetap aman tersimpan di perangkat ini.
        </p>

        <DialogFooter>
          <Button size="sm" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Simpan ke akun saya</DialogTitle>
        <DialogDescription>
          Sekarang karyamu tersimpan di perangkat ini saja. Buat akun agar tidak
          hilang saat browser dibersihkan, dan bisa dibuka dari perangkat lain.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="claim-email">
          Email
        </label>
        <Input
          id="claim-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && valid && !busy) submit();
          }}
        />
        {session && (
          <p className="text-muted-foreground text-[11px]">
            Sesi{" "}
            <span className="font-mono tracking-wider">{session.code}</span>{" "}
            beserta seluruh desainnya akan dipindahkan.
          </p>
        )}
      </div>

      <DialogFooter className="sm:items-center sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Nanti saja
        </Button>
        <Button size="sm" onClick={submit} disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <UserRoundPlus />}
          Buat akun &amp; simpan
        </Button>
      </DialogFooter>
    </>
  );
}

/** Top-bar entry into the claim flow, shown only on the guest session page. */
export function SaveToAccountButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <UserRoundPlus />
        <span className="hidden sm:inline">Simpan ke akun</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <ClaimSheet onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
