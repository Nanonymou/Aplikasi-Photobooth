"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MailCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthError, EMAIL, sendMagicLink } from "@/lib/auth/client";

/** Seconds before a fresh link may be sent again, so mail is not spammed. */
const RESEND_COOLDOWN = 30;

/**
 * Signing in.
 *
 * One field, because there is no password to ask for: this installation
 * authenticates by emailing a one-time link, which is what the product asks for
 * and the only thing the server can check. The form that used to sit here asked
 * for a password no endpoint would ever have verified.
 *
 * Sent, it stops being a form and becomes an instruction — check your inbox —
 * rather than something the user might submit again. The resend sits behind a
 * cooldown, because the fix for "it did not arrive" is usually patience.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(true);
  const [cooldown, setCooldown] = useState(0);

  const valid = EMAIL.test(email.trim());

  // setState inside the interval callback is the allowed timer pattern, not a
  // synchronous setState in the effect body.
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
            Tautan masuk dikirim ke <span className="font-medium">{sentTo}</span>.
          </p>
          <p className="text-muted-foreground text-xs text-pretty">
            Buka email itu di perangkat ini lalu tekan tautannya. Cek juga folder
            spam kalau belum terlihat.
          </p>
        </div>

        {/*
          An install with no mail provider puts the link in the server log. Not
          saying so leaves somebody refreshing an inbox nothing will arrive in.
        */}
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

        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setCooldown(0);
          }}
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          Ganti email
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="login-email">
          Email
        </label>
        <Input
          id="login-email"
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
          Tanpa kata sandi. Kami kirim tautan masuk sekali pakai ke email itu.
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
        Kirim tautan masuk
      </Button>
    </>
  );
}
