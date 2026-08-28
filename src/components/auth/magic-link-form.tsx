"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, Loader2, Mail, MailCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthError, EMAIL, sendMagicLink } from "@/lib/auth/client";

/** Seconds before a fresh link may be sent again, so mail is not spammed. */
const RESEND_COOLDOWN = 30;

/**
 * Passwordless sign-in.
 *
 * The whole appeal is that there is nothing to remember: type an email, get a
 * link, tap it. So the form is one field, and the moment it is sent it becomes
 * an instruction — check your inbox — rather than staying a form the user might
 * resubmit. A resend sits behind a short cooldown, because the fix for "it did
 * not arrive" is usually patience, not a second identical mail.
 */
export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const valid = EMAIL.test(email.trim());

  // Tick the resend cooldown down. setState inside the interval callback is the
  // allowed timer pattern, not a synchronous setState in the effect body.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((left) => Math.max(0, left - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function send() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendMagicLink(email);
      setSentTo(email.trim());
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
            Tautan masuk dikirim ke{" "}
            <span className="font-medium">{sentTo}</span>.
          </p>
          <p className="text-muted-foreground text-xs text-pretty">
            Buka email itu di perangkat ini lalu tekan tautannya. Cek juga
            folder spam kalau belum terlihat.
          </p>
        </div>

        {error && (
          <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={send}
            disabled={busy || cooldown > 0}
            className="w-full"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Mail />}
            {cooldown > 0 ? `Kirim ulang dalam ${cooldown}s` : "Kirim ulang"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSentTo(null);
              setError(null);
              setCooldown(0);
            }}
            className="w-full"
          >
            Ganti email
          </Button>
        </div>

        <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
          <Info className="mt-0.5 size-3 shrink-0" />
          Layanan masih disiapkan — ini pratinjau alurnya, jadi belum ada email
          sungguhan yang dikirim.{" "}
          <Link
            href="/masuk-tautan/verifikasi?token=demo"
            className="text-foreground underline underline-offset-2"
          >
            Buka tautan (pratinjau)
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="magic-email">
          Email
        </label>
        <Input
          id="magic-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && valid && !busy) send();
          }}
        />
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
