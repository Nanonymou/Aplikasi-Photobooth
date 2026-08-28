"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AuthError,
  completeOAuth,
  POST_LOGIN_REDIRECT,
  providerLabel,
} from "@/lib/auth/client";

/** How long the "signed in" tick shows before the redirect takes over. */
const REDIRECT_DELAY = 900;

type State =
  | { status: "completing" }
  | { status: "ok" }
  | { status: "error"; message: string };

/**
 * The provider's redirect target.
 *
 * A Google or Apple consent screen sends the guest back here with a code; this
 * page's whole job is to turn that code into a session and get out of the way.
 * So it completes on mount, shows a spinner while it does, and on success
 * redirects to the workspace rather than making the user press anything — the
 * consent tap was the intent. Only a bad or denied hand-off stops to explain,
 * with the one useful next step: back to the sign-in screen to retry.
 *
 * Nothing reaches this page today: the provider exchange is not installed, so
 * the sign-in screens show their SSO buttons switched off and the endpoint here
 * refuses. The page stays because it is the address a provider redirects to, and
 * it already reports a refusal as the error it is.
 */
export function OAuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>({ status: "completing" });

  const label = providerLabel(params.get("provider"));
  const withProvider = label ? ` dengan ${label}` : "";

  useEffect(() => {
    let cancelled = false;
    let redirect: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      try {
        await completeOAuth({
          provider: params.get("provider"),
          code: params.get("code"),
          error: params.get("error"),
        });
        if (cancelled) return;

        setState({ status: "ok" });
        // `replace`, not `push`, so the one-time callback URL never sits in the
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
              : "Gagal menyelesaikan masuk. Coba lagi.",
        });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(redirect);
    };
  }, [params, router]);

  if (state.status === "completing") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Menyelesaikan masuk{withProvider}…
        </p>
      </div>
    );
  }

  if (state.status === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <CheckCircle2 className="size-5" />
        </span>
        <p className="text-sm">Berhasil masuk{withProvider}. Mengalihkan…</p>
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
        <Link href="/masuk">Kembali ke halaman masuk</Link>
      </Button>
    </div>
  );
}
