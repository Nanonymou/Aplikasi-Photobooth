"use client";

import { useState } from "react";
import { Info, Loader2, LogIn, TriangleAlert } from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthError, EMAIL, login } from "@/lib/auth/mock-auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

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
