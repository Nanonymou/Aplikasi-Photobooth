"use client";

import { useState } from "react";
import {
  CloudCheck,
  Info,
  Loader2,
  TriangleAlert,
  UserRoundPlus,
} from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  AuthError,
  claimSession,
  EMAIL,
  login,
  MIN_PASSWORD,
  register,
} from "@/lib/auth/mock-auth";
import { useGuestSession } from "@/lib/session/guest-session";
import { toast } from "@/store/toast-store";
import { useEditorStore } from "@/store/editor-store";

type Mode = "register" | "login";

/**
 * The claim flow: guest work → account.
 *
 * A guest's designs live only on this device under an anonymous session. This
 * is where that changes hands: the guest signs in — new account or existing —
 * and the work stamped with their session moves into it. All three steps are
 * here in one place (choose, authenticate, confirm) because a guest who has to
 * leave the editor to make an account is a guest who abandons it.
 *
 * Auth and the claim are mocked (frontend-first), but the flow is complete: the
 * summary names what will move, register and login are the real forms, and the
 * error paths fire. When the endpoints land they replace `runClaim`.
 */
function ClaimSheet({ onClose }: { onClose: () => void }) {
  const session = useGuestSession();
  const title = useEditorStore((state) => state.project.title);
  const pageCount = useEditorStore((state) => state.project.pages.length);

  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedTo, setClaimedTo] = useState<string | null>(null);

  const emailOk = EMAIL.test(email.trim());
  const passwordOk =
    mode === "register" ? password.length >= MIN_PASSWORD : password.length > 0;
  const nameOk = mode === "login" || name.trim().length > 0;
  const valid = emailOk && passwordOk && nameOk;

  async function runClaim() {
    if (!valid || busy || !session) return;
    setBusy(true);
    setError(null);
    try {
      // Authenticate first — the account has to exist before work can move into
      // it — then hand the session over.
      if (mode === "register") await register(name, email, password);
      else await login(email, password);

      await claimSession(session.code);

      setClaimedTo(email.trim());
      toast({
        variant: "success",
        title: "Karyamu diamankan",
        description: `Dipindahkan ke ${email.trim()}.`,
      });
    } catch (cause) {
      setError(
        cause instanceof AuthError ? cause.message : "Gagal menyimpan. Coba lagi.",
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
            <span className="text-foreground font-medium">{title}</span> dan
            seluruh isinya sekarang ada di akun{" "}
            <span className="text-foreground font-medium">{claimedTo}</span> —
            tetap ada meski browser dibersihkan atau kamu ganti perangkat.
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
          Sekarang karyamu tersimpan di perangkat ini saja. Masuk atau buat akun
          untuk memindahkannya agar tidak hilang.
        </DialogDescription>
      </DialogHeader>

      {/* What is about to move — named, so the claim is concrete, not abstract. */}
      <div className="border-editor-border bg-editor-surface flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
        <span className="min-w-0 truncate">
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground">
            {" "}
            · {pageCount} halaman
          </span>
        </span>
        {session && (
          <span className="text-muted-foreground shrink-0 font-mono tracking-wider">
            {session.code}
          </span>
        )}
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        onValueChange={(value) => {
          if (!value) return;
          setMode(value as Mode);
          setError(null);
        }}
        className="w-full"
      >
        <ToggleGroupItem value="register" className="flex-1">
          Akun baru
        </ToggleGroupItem>
        <ToggleGroupItem value="login" className="flex-1">
          Sudah punya akun
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === "register" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" htmlFor="claim-name">
            Nama
          </label>
          <Input
            id="claim-name"
            autoComplete="name"
            placeholder="Nama kamu"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      )}

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
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="claim-password">
          Kata sandi
        </label>
        <PasswordField
          id="claim-password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          onEnter={runClaim}
        />
        {mode === "register" && (
          <p
            className={
              password.length > 0 && !passwordOk
                ? "text-destructive text-[11px]"
                : "text-muted-foreground text-[11px]"
            }
          >
            Minimal {MIN_PASSWORD} karakter.
          </p>
        )}
      </div>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <DialogFooter className="sm:items-center sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Nanti saja
        </Button>
        <Button size="sm" onClick={runClaim} disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <UserRoundPlus />}
          {mode === "register" ? "Buat akun & simpan" : "Masuk & simpan"}
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
