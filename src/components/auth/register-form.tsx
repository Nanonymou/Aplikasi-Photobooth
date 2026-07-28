"use client";

import { useState } from "react";
import { Info, Loader2, TriangleAlert, UserRoundPlus } from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthError, EMAIL, MIN_PASSWORD, register } from "@/lib/auth/mock-auth";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const nameOk = name.trim().length > 0;
  const emailOk = EMAIL.test(email.trim());
  const passwordOk = password.length >= MIN_PASSWORD;
  const valid = nameOk && emailOk && passwordOk;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const account = await register(name, email, password);
      setCreated(account.name);
    } catch (cause) {
      setError(
        cause instanceof AuthError
          ? cause.message
          : "Gagal membuat akun. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm">
          Akun untuk <span className="font-medium">{created}</span> siap.
        </p>
        <p className="text-muted-foreground flex items-start gap-1.5 text-left text-[11px] leading-relaxed">
          <Info className="mt-0.5 size-3 shrink-0" />
          Layanan akun masih disiapkan — ini pratinjau alurnya. Karyamu di
          perangkat ini akan dipindahkan begitu fiturnya aktif.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="register-name">
          Nama
        </label>
        <Input
          id="register-name"
          autoComplete="name"
          placeholder="Nama kamu"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

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
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="register-password">
          Kata sandi
        </label>
        <PasswordField
          id="register-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          onEnter={submit}
        />
        <p
          className={
            password.length > 0 && !passwordOk
              ? "text-destructive text-[11px]"
              : "text-muted-foreground text-[11px]"
          }
        >
          Minimal {MIN_PASSWORD} karakter.
        </p>
      </div>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <Button onClick={submit} disabled={!valid || busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <UserRoundPlus />}
        Buat akun
      </Button>
    </>
  );
}
