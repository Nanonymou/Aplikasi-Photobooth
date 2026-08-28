"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MailCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthError, EMAIL, sendMagicLink } from "@/lib/auth/client";

/** Seconds before a fresh link may be sent again, so mail is not spammed. */
const RESEND_COOLDOWN = 30;

/**
 * Making an account.
 *
 * The same one field and the same one link as signing in, because on a
 * passwordless install they are the same act: the first time an address
 * redeems a link, the account is created. Asking for a name and a password up
 * front would be collecting two things — one the server has no column for, and
 * one the person can set later on their profile — in exchange for a step that
 * makes signing up slower than signing in.
 *
 * An installation that has closed registration refuses at the link, and the
 * message the server sends is what gets shown.
 */
export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(true);
  const [cooldown, setCooldown] = useState(0);

  const valid = EMAIL.test(email.trim());

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(
      () => setCooldown((left) => Math.max(0, left - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [cooldown]);

  async function send() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendMagicLink(email);
      setSentTo(email.trim());
      setDelivered(result.delivered);
      setCooldown(RESEND_COOLDOWN);
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

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
            <MailCheck className="size-5" />
          </span>
          <p className="text-sm">
            Tautan dikirim ke <span className="font-medium">{sentTo}</span>.
          </p>
          <p className="text-muted-foreground text-xs text-pretty">
            Tekan tautan di email itu untuk menyelesaikan pendaftaran. Karyamu
            di perangkat ini ikut pindah ke akun barumu.
          </p>
        </div>

        {!delivered && (
          <p className="text-muted-foreground flex items-start gap-1.5 rounded-lg border border-dashed px-3 py-2 text-[11px] leading-relaxed">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" />
            Belum ada penyedia email yang dikonfigurasi di booth ini, jadi
            tautannya tercatat di log server, bukan terkirim ke inbox.
          </p>
        )}

        {error && (
          <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" />
            {error}
          </p>
        )}

        <Button
          variant="outline"
          onClick={send}
          disabled={busy || cooldown > 0}
          className="w-full"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Mail />}
          {cooldown > 0 ? `Kirim ulang dalam ${cooldown}s` : "Kirim ulang tautan"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="register-email">
          Email
        </label>
        <Input
          id="register-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void send();
          }}
        />
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Tanpa kata sandi. Nama tampilan bisa kamu atur nanti di profil.
        </p>
      </div>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <Button onClick={send} disabled={!valid || busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Mail />}
        Daftar dengan tautan email
      </Button>
    </>
  );
}
