"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Info, Loader2, LogIn, TriangleAlert } from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthError, EMAIL, login } from "@/lib/auth/mock-auth";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);
  // UI-only for now: when the real endpoint lands it decides how long the
  // session sticks around. Kept here so the choice is made at sign-in time.
  const [remember, setRemember] = useState(true);

  const valid = EMAIL.test(email.trim()) && password.length > 0;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const account = await login(email, password);
      setWelcome(account.name);
    } catch (cause) {
      setError(
        cause instanceof AuthError ? cause.message : "Gagal masuk. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (welcome) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm">
          Selamat datang kembali,{" "}
          <span className="font-medium">{welcome}</span>.
        </p>
        <p className="text-muted-foreground flex items-start gap-1.5 text-left text-[11px] leading-relaxed">
          <Info className="mt-0.5 size-3 shrink-0" />
          Layanan akun masih disiapkan — ini pratinjau alurnya. Karyamu tetap
          aman tersimpan di perangkat ini.
        </p>
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
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="login-password">
          Kata sandi
        </label>
        <PasswordField
          id="login-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          onEnter={submit}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          role="checkbox"
          aria-checked={remember}
          onClick={() => setRemember((on) => !on)}
          className="text-muted-foreground flex items-center gap-2 text-xs select-none"
        >
          <span
            className={cn(
              "border-input flex size-4 items-center justify-center rounded-[4px] border transition-colors",
              remember && "bg-primary border-primary text-primary-foreground",
            )}
          >
            {remember && <Check className="size-3" strokeWidth={3} />}
          </span>
          Ingat saya
        </button>
        <Link
          href="/masuk-tautan"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          Lupa kata sandi?
        </Link>
      </div>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <Button onClick={submit} disabled={!valid || busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <LogIn />}
        Masuk
      </Button>
    </>
  );
}
