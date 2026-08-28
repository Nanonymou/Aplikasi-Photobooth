"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AuthError,
  POST_LOGIN_REDIRECT,
  verifyMagicLink,
} from "@/lib/auth/client";

/**
 * How long the "signed in" tick shows before the redirect takes over.
 *
 * Long enough to read the line about what was claimed, which is the one thing
 * on this screen somebody might actually want to see.
 */
const REDIRECT_DELAY = 1600;

type State =
  | { status: "verifying" }
  | { status: "ok"; claimed: { designs: number; photos: number } | null }
  | { status: "error"; message: string };

/**
 * The magic link's destination.
 *
 * A link from an email lands here with a token; the page's whole job is to turn
 * that token into a session and get out of the way. So it verifies on mount,
 * shows a spinner while it does, and on success redirects to the workspace
 * rather than making the user press anything — the tap on the email link was
 * the intent. Only a bad token stops to explain itself, with the one useful
 * next step: request a fresh link.
 */
export function VerifyMagicLink() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>({ status: "verifying" });

  useEffect(() => {
    let cancelled = false;
    let redirect: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      try {
        const { claimed } = await verifyMagicLink(params.get("token"));
        if (cancelled) return;

        setState({ status: "ok", claimed });
        // `replace`, not `push`, so the one-time token URL never sits in the
        // back stack where re-visiting it would just fail.
        redirect = setTimeout(
          () => router.replace(POST_LOGIN_REDIRECT),
          REDIRECT_DELAY,
        );
      } catch (cause) {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            cause instanceof AuthError
              ? cause.message
              : "Verifikasi gagal. Coba minta tautan baru.",
        });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(redirect);
    };
  }, [params, router]);

  if (state.status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
        <p className="text-muted-foreground text-sm">Memverifikasi tautan…</p>
      </div>
    );
  }

  if (state.status === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <CheckCircle2 className="size-5" />
        </span>
        <p className="text-sm">Berhasil masuk. Mengalihkan…</p>
        {/* What came along from this browser's guest session. Worth saying: a
            guest who just signed in wants to know their work followed them. */}
        {state.claimed && state.claimed.designs > 0 && (
          <p className="text-muted-foreground text-xs">
            {state.claimed.designs} desain dan {state.claimed.photos} foto dari
            perangkat ini dipindahkan ke akunmu.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-destructive flex items-start gap-1.5 text-sm leading-relaxed">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        {state.message}
      </p>
      <Button asChild size="sm" className="w-full">
        <Link href="/masuk-tautan">Minta tautan baru</Link>
      </Button>
    </div>
  );
}
