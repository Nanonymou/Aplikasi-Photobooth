"use client";

import { useState } from "react";
import {
  CloudCheck,
  Loader2,
  Mail,
  MailCheck,
  TriangleAlert,
  UserRoundPlus,
} from "lucide-react";
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
import { AuthError, claimSession, EMAIL, sendMagicLink } from "@/lib/auth/client";
import { refreshAccount, useAccount } from "@/lib/auth/use-account";
import {
  refreshGuestSession,
  useGuestSession,
} from "@/lib/session/guest-session";
import { toast } from "@/store/toast-store";
import { useEditorStore } from "@/store/editor-store";

/**
 * The claim flow: guest work → account.
 *
 * A guest's designs live under an anonymous session tied to this browser. This
 * is where that changes hands, and it has two shapes because the guest arrives
 * in one of two states.
 *
 * Already signed in on this device — which happens: somebody signs in, then
 * keeps working under the cookie they had — and the claim is one call, right
 * now, with the result reported.
 *
 * Not signed in, and there is nothing to do here but send a link. On a
 * passwordless install the account cannot be created inside this dialog; the
 * link arrives by email and lands on the verify page, which signs them in and
 * claims this browser's session as part of the same act. So the dialog's job is
 * to say what will move and get the link sent, not to pretend the transfer
 * finishes here.
 */
function ClaimSheet({ onClose }: { onClose: () => void }) {
  const session = useGuestSession();
  const account = useAccount();
  const title = useEditorStore((state) => state.project.title);
  const pageCount = useEditorStore((state) => state.project.pages.length);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedTo, setClaimedTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [moved, setMoved] = useState<{ designs: number; photos: number } | null>(
    null,
  );

  const valid = EMAIL.test(email.trim());

  /** Signed in already: hand the session over now. */
  async function claimNow() {
    if (busy || !session || !account) return;
    setBusy(true);
    setError(null);
    try {
      const result = await claimSession(session.code);
      setMoved(result);
      setClaimedTo(account.email);
      await Promise.all([refreshAccount(), refreshGuestSession()]);
      toast({
        variant: "success",
        title: "Karyamu diamankan",
        description: `${result.designs} desain dipindahkan ke ${account.email}.`,
      });
    } catch (cause) {
      setError(
        cause instanceof AuthError ? cause.message : "Gagal menyimpan. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  /** Not signed in: the link does both, on the page it lands on. */
  async function sendLink() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendMagicLink(email);
      setSentTo(email.trim());
    } catch (cause) {
      setError(
        cause instanceof AuthError
          ? cause.message
          : "Tautan gagal dikirim. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (claimedTo) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudCheck className="text-primary size-5" />
            Karyamu diamankan
          </DialogTitle>
          <DialogDescription>
            {moved
              ? `${moved.designs} desain dan ${moved.photos} foto`
              : "Karyamu"}{" "}
            sekarang ada di akun{" "}
            <span className="text-foreground font-medium">{claimedTo}</span> —
            tetap ada meski browser dibersihkan atau kamu ganti perangkat.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button size="sm" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </>
    );
  }

  // Claimed already, so there is nothing here to move: the server hands a
  // session over once and then refuses, and offering the button anyway would
  // spend a round trip to be told the session no longer exists.
  if (session?.claimedAt) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudCheck className="text-primary size-5" />
            Sudah tersimpan di akun
          </DialogTitle>
          <DialogDescription>
            Karya sesi ini sudah dipindahkan ke sebuah akun. Masuk dengan akun
            itu untuk membukanya di perangkat mana pun.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button size="sm" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </>
    );
  }

  const summary = (
    /* What is about to move — named, so the claim is concrete, not abstract. */
    <div className="border-editor-border bg-editor-surface flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
      <span className="min-w-0 truncate">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground"> · {pageCount} halaman</span>
      </span>
      {session && (
        <span className="text-muted-foreground shrink-0 font-mono tracking-wider">
          {session.code}
        </span>
      )}
    </div>
  );

  const problem = error && (
    <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
      <TriangleAlert className="mt-0.5 size-3 shrink-0" />
      {error}
    </p>
  );

  // Sent, and there is nothing left to do in this dialog: the transfer happens
  // when the link is opened, not here. Saying otherwise would be a lie the user
  // discovers later.
  if (sentTo) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailCheck className="text-primary size-5" />
            Cek email kamu
          </DialogTitle>
          <DialogDescription>
            Tautan masuk dikirim ke{" "}
            <span className="text-foreground font-medium">{sentTo}</span>. Buka
            di perangkat ini — karyamu ikut pindah begitu kamu masuk.
          </DialogDescription>
        </DialogHeader>

        {summary}

        <DialogFooter>
          <Button size="sm" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </>
    );
  }

  // Already signed in on this device: no email round trip needed.
  if (account) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Simpan ke akun saya</DialogTitle>
          <DialogDescription>
            Kamu sudah masuk sebagai{" "}
            <span className="text-foreground font-medium">{account.email}</span>.
            Pindahkan karya di perangkat ini ke akun itu sekarang.
          </DialogDescription>
        </DialogHeader>

        {summary}
        {problem}

        <DialogFooter className="sm:items-center sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Nanti saja
          </Button>
          <Button size="sm" onClick={claimNow} disabled={busy || !session}>
            {busy ? <Loader2 className="animate-spin" /> : <CloudCheck />}
            Pindahkan sekarang
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
          Sekarang karyamu tersimpan di perangkat ini saja. Masukkan emailmu —
          kami kirim tautan masuk, dan karyamu ikut pindah begitu kamu tekan
          tautannya.
        </DialogDescription>
      </DialogHeader>

      {summary}

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
            if (event.key === "Enter") void sendLink();
          }}
        />
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Tanpa kata sandi. Akun dibuat otomatis kalau emailnya belum terdaftar.
        </p>
      </div>

      {problem}

      <DialogFooter className="sm:items-center sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Nanti saja
        </Button>
        <Button size="sm" onClick={sendLink} disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Mail />}
          Kirim tautan
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
