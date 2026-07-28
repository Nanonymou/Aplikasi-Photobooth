"use client";

import { useState } from "react";
import { CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";

import { AppleIcon, GoogleIcon } from "@/components/auth/provider-icons";
import { Button } from "@/components/ui/button";
import {
  AuthError,
  signInWithProvider,
  SSO_PROVIDERS,
  type SsoProvider,
} from "@/lib/auth/mock-auth";

const ICONS: Record<SsoProvider, typeof GoogleIcon> = {
  google: GoogleIcon,
  apple: AppleIcon,
};

/**
 * "Continue with Google / Apple" — the SSO half of the auth screens.
 *
 * The whole appeal of social sign-in is skipping the form, so this sits beside
 * the email fields as a full alternative, not an afterthought: two provider
 * buttons under a plain divider. One click owns both buttons (you cannot start a
 * second round trip mid-flight), and the same button reports success or a failed
 * hand-off in place. The provider does the authenticating; when the real OAuth
 * callback lands, only `signInWithProvider` changes.
 */
export function SocialLogin({
  dividerLabel = "atau lanjutkan dengan",
}: {
  dividerLabel?: string;
}) {
  const [pending, setPending] = useState<SsoProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedInWith, setSignedInWith] = useState<string | null>(null);

  async function connect(provider: SsoProvider) {
    if (pending) return;
    setPending(provider);
    setError(null);
    try {
      const account = await signInWithProvider(provider);
      setSignedInWith(account.name);
    } catch (cause) {
      setError(
        cause instanceof AuthError
          ? cause.message
          : "Gagal masuk lewat penyedia. Coba lagi.",
      );
    } finally {
      setPending(null);
    }
  }

  if (signedInWith) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm">
          <CheckCircle2 className="text-primary size-4" />
          Masuk sebagai <span className="font-medium">{signedInWith}</span>.
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="border-editor-border h-px flex-1 border-t" />
        <span className="text-muted-foreground text-[11px]">{dividerLabel}</span>
        <span className="border-editor-border h-px flex-1 border-t" />
      </div>

      <div className="flex flex-col gap-2">
        {SSO_PROVIDERS.map(({ id, label }) => {
          const Icon = ICONS[id];
          return (
            <Button
              key={id}
              variant="outline"
              onClick={() => connect(id)}
              disabled={pending !== null}
              className="w-full"
            >
              {pending === id ? <Loader2 className="animate-spin" /> : <Icon />}
              Masuk dengan {label}
            </Button>
          );
        })}
      </div>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
